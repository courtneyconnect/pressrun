// Background jobs: making a Press Stop's card and clip (S8 → S9) and remaking
// them after a change request (S10). Runs in the same process on a timer.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Job, Store } from "./db/store";
import * as C from "./engine/copy";
import { renderCard, renderEndCard, renderList } from "./media/card";
import { fetchSample, grabFrame, makeClip, SampleUnavailable } from "./media/clip";
import type { FileStore } from "./media/files";
import { logOut } from "./outbox";
import type { Provider } from "./providers/provider";
import type { Account, Out, PressStop, RunRequest } from "./types";
import { andList, describeRequest } from "./run/match";
import { bookerContext } from "./run/options";

export interface WorkerDeps {
  store: Store;
  provider: Provider;
  files: FileStore;
  clock?: () => Date;
}

const MAX_ATTEMPTS = 3;

/** Runs every due job once. Returns how many ran. */
export async function runJobs(deps: WorkerDeps): Promise<number> {
  const now = deps.clock?.() ?? new Date();
  const jobs = await deps.store.claimJobs(now);
  for (const job of jobs) {
    try {
      if (job.kind === "build_stop_media") await buildStopMedia(deps, job);
      else if (job.kind === "send_options") await sendOptions(deps, job);
      else if (job.kind === "send_list") await sendList(deps, job);
      else if (job.kind === "shortlist_summary") await shortlistSummary(deps, job);
      await deps.store.finishJob(job.id, "done");
    } catch (err) {
      await onFailure(deps, job, err, now);
    }
  }
  return jobs.length;
}

async function deliver(deps: WorkerDeps, account: Account, out: Out[]): Promise<void> {
  await logOut(deps.store, account.id, out);
  await deps.provider.send(account.phone, out);
}

class NoReadableSamples extends Error {
  constructor(public link: string) { super(`No readable samples (${link})`); }
}

let endCard: Promise<Uint8Array> | null = null;

export async function coverDataUrl(deps: WorkerDeps, stop: PressStop): Promise<string | undefined> {
  try {
    if (stop.cover === "frame" && stop.media?.coverKey) {
      const bytes = await deps.files.get(stop.media.coverKey);
      return bytes ? `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}` : undefined;
    }
    if (stop.cover && stop.cover !== "frame") {
      const local = stop.cover.startsWith("file://") || stop.cover.startsWith("/");
      const bytes = local
        ? new Uint8Array(await Bun.file(stop.cover.replace(/^file:\/\//, "")).arrayBuffer())
        : new Uint8Array(await (await fetch(stop.cover)).arrayBuffer());
      const type = /\.png$/i.test(stop.cover) ? "image/png" : "image/jpeg";
      return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
    }
  } catch {
    // No cover is fine: the card falls back to the brand background.
  }
  return undefined;
}

async function buildStopMedia(deps: WorkerDeps, job: Job): Promise<void> {
  const { accountId, stopId, part, first } = job.payload as { accountId: string; stopId: string; part: "both" | "card" | "clip"; first: boolean };
  const account = await deps.store.accountById(accountId);
  const stop = await deps.store.stop(stopId);
  if (!account || !stop) return;
  const media = { ...(stop.media ?? { version: 0 }) };
  media.version += 1;
  const dir = await mkdtemp(join(tmpdir(), "pressrun-build-"));
  try {
    if (part !== "card") {
      // Try the chosen video first, then the others.
      const start = media.episode ?? 0;
      const order = [start, ...stop.samples.map((_, i) => i).filter(i => i !== start)];
      let samplePath: string | undefined;
      let firstBad: string | undefined;
      for (const i of order) {
        if (!stop.samples[i]) continue;
        try { samplePath = await fetchSample(stop.samples[i]!, dir); media.episode = i; break; }
        catch (e) { if (e instanceof SampleUnavailable) firstBad ??= e.link; else throw e; }
      }
      if (!samplePath) throw new NoReadableSamples(firstBad ?? "your links");
      endCard ??= renderEndCard();
      const clip = await makeClip(samplePath, await endCard, { start: media.clipStart });
      media.clipStart = clip.start;
      media.clipUrl = await deps.files.put(`stops/${stop.id}/clip-v${media.version}.mp4`, clip.data, "video/mp4");
      if (stop.cover === "frame") {
        const clipPath = join(dir, "clip.mp4");
        await Bun.write(clipPath, clip.data);
        media.coverKey = `stops/${stop.id}/cover-v${media.version}.jpg`;
        await deps.files.put(media.coverKey, await grabFrame(clipPath, 6), "image/jpeg");
      }
    }
    stop.media = media;
    if (part !== "clip" || stop.cover === "frame") {
      const png = await renderCard(stop, null, await coverDataUrl(deps, stop));
      media.cardUrl = await deps.files.put(`stops/${stop.id}/card-v${media.version}.png`, png, "image/png");
    }
    stop.media = media;
    stop.status = stop.status === "live" ? "live" : "pending_approval";
    await deps.store.saveStop(stop);

    const series = stop.seriesName ?? "your show";
    const card: Out = { type: "image", url: media.cardUrl!, alt: `Press Run card for ${series}`, ref: `card:${stop.id}` };
    const clip: Out = { type: "video", url: media.clipUrl!, alt: `Sample clip for ${series}`, ref: `clip:${stop.id}` };
    let out: Out[];
    if (first) {
      out = [C.S9_HERE(series), card, clip, C.S9_REPLY];
      if (account.flow === "stop" && account.step === "S9wait") account.step = "S10";
    } else {
      out = [C.S10_UPDATED, ...(part !== "clip" || stop.cover === "frame" ? [card] : []), ...(part !== "card" ? [clip] : [])];
    }
    await deps.store.saveAccount(account);
    await deliver(deps, account, out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function onFailure(deps: WorkerDeps, job: Job, err: unknown, now: Date): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const { accountId, stopId } = job.payload as { accountId?: string; stopId?: string };
  const account = accountId ? await deps.store.accountById(accountId) : null;

  if (err instanceof NoReadableSamples && account && stopId) {
    // Back to S6: ask them to send the video again.
    const stop = await deps.store.stop(stopId);
    if (stop) { stop.samples = []; stop.status = "draft"; await deps.store.saveStop(stop); }
    account.flow = "stop";
    account.step = "S6";
    account.state.pending = null;
    await deps.store.saveAccount(account);
    await deliver(deps, account, [C.S6_RESEND]);
    await deps.store.finishJob(job.id, "failed", message);
    return;
  }
  if (job.attempts < MAX_ATTEMPTS) {
    await deps.store.retryJob(job.id, new Date(now.getTime() + 30_000 * job.attempts), message);
    return;
  }
  await deps.store.finishJob(job.id, "failed", message);
  if (account) {
    account.needsHuman = true;
    await deps.store.saveAccount(account);
    await deliver(deps, account, [C.S8_SNAG]);
  }
}

// ---------- Run requests (booker script R2–R3) ----------

async function requestAndBooker(deps: WorkerDeps, requestId: string): Promise<{ req: RunRequest; account: Account } | null> {
  const req = await deps.store.request(requestId);
  const account = req ? await deps.store.accountById(req.bookerId) : null;
  return req && account ? { req, account } : null;
}

/** Card + clip for each number, with the number drawn on the card. */
async function optionBubbles(deps: WorkerDeps, req: RunRequest, numbers: number[]): Promise<Out[]> {
  const out: Out[] = [];
  for (const n of numbers) {
    const opt = req.options.find(o => o.number === n);
    const stop = opt && (await deps.store.stop(opt.stopId));
    if (!stop) continue;
    const png = await renderCard(stop, n, await coverDataUrl(deps, stop));
    const url = await deps.files.put(`requests/${req.id}/card-${n}.png`, png, "image/png");
    const ref = `opt:${req.id}:${n}`;
    out.push({ type: "image", url, alt: `${n} · ${stop.seriesName}`, ref });
    if (stop.media?.clipUrl) out.push({ type: "video", url: stop.media.clipUrl, alt: `Sample clip for ${stop.seriesName}`, ref });
  }
  return out;
}

async function sendOptions(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { requestId: string; numbers: number[]; intro?: Out[]; outro?: "summary" | "none"; after?: Out[] };
  const ctx = await requestAndBooker(deps, p.requestId);
  if (!ctx) return;
  const { req, account } = ctx;
  const out: Out[] = [...(p.intro ?? []), ...(await optionBubbles(deps, req, p.numbers)), ...(p.after ?? [])];
  if (p.outro === "summary") {
    const opts = req.options.filter(o => p.numbers.includes(o.number));
    const stops = (await Promise.all(opts.map(o => deps.store.stop(o.stopId)))).filter((s): s is PressStop => !!s);
    const low = stops.reduce((sum, s) => sum + (s.rateLow ?? 0), 0);
    const high = stops.reduce((sum, s) => sum + (s.rateHigh ?? s.rateLow ?? 0), 0);
    const total = high === 0 ? "all free" : low === high ? `$${high} total if you book all of them` : `$${low}–$${high} total if you book all of them`;
    const matches = opts.filter(o => o.why).map(o => `${o.number} is an interest match for ${o.why}.`).join(" ");
    if (!opts.length) out.push(C.R_NONE);
    else if (opts.length < 3) out.push(C.R_FEW(opts.length, req.budgetMax && req.budgetMax > 0 ? req.budgetMax : 500));
    else out.push(C.R_SUMMARY(opts.length, total, matches ? matches + " " : ""));
  }
  await deliver(deps, account, out);
}

async function sendList(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { requestId: string; numbers: number[]; intro?: Out[] };
  const ctx = await requestAndBooker(deps, p.requestId);
  if (!ctx) return;
  const { req, account } = ctx;
  const { talent } = await bookerContext(deps.store, account.id);
  const rows: { number: number; stop: PressStop; why?: string }[] = [];
  for (const n of p.numbers.slice(0, 20)) {
    const o = req.options.find(x => x.number === n);
    const stop = o && (await deps.store.stop(o.stopId));
    if (o && stop) rows.push({ number: n, stop, why: o.why });
  }
  const title = describeRequest(req, talent).split(", ").slice(0, 2).join(" · ");
  const png = await renderList(title, `${p.numbers.length} Press Stops · reply with numbers`, rows);
  const url = await deps.files.put(`requests/${req.id}/list-${job.id}.png`, png, "image/png");
  const out: Out[] = [...(p.intro ?? []), C.R_LIST_INTRO(p.numbers.length), { type: "image", url, alt: `Master list: ${p.numbers.length} Press Stops`, ref: `list:${req.id}` }, C.R_LIST_HOW];
  if (p.numbers.length > 20) out.push(C.R_LIST_MORE);
  await deliver(deps, account, out);
}

async function shortlistSummary(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { requestId: string; stamp: string };
  const ctx = await requestAndBooker(deps, p.requestId);
  if (!ctx || ctx.req.lastReactionAt !== p.stamp) return; // a newer reaction will send its own summary
  const nums = ctx.req.options.filter(o => o.state === "shortlisted").map(o => String(o.number));
  if (nums.length) await deliver(deps, ctx.account, [C.R_SHORTLIST(andList(nums))]);
}
