// Background jobs: making a Press Stop's card and clip (S8 → S9) and remaking
// them after a change request (S10). Runs in the same process on a timer.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Job, Store } from "./db/store";
import * as C from "./engine/copy";
import { renderCard, renderEndCard, renderList, renderRecap, renderRunSheet } from "./media/card";
import { platformOf } from "./run/followup";
import { fetchSample, grabFrame, makeClip, SampleUnavailable } from "./media/clip";
import type { FileStore } from "./media/files";
import { logOut } from "./outbox";
import type { Provider } from "./providers/provider";
import type { Account, Conversation, Out, PressStop, RunRequest } from "./types";
import { andList, describeRequest } from "./run/match";
import { bookerContext } from "./run/options";
import { bookerLabel, dateRange, settleRun, stopLabel, talentNames } from "./run/relay";
import { fmtTime, icsCalendar } from "./run/time";
import { dayName, fmtDate } from "./engine/parse";

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
      else if (job.kind === "conv_nudge") await convNudge(deps, job);
      else if (job.kind === "conv_expire") await convExpire(deps, job, now);
      else if (job.kind === "stop_calendar") await stopCalendar(deps, job);
      else if (job.kind === "reminder") await reminder(deps, job);
      else if (job.kind === "runsheet") await runSheet(deps, job, now);
      else if (job.kind === "shoot_wrap") await shootWrap(deps, job, now);
      else if (job.kind === "edit_nudge_stop") await editNudgeStop(deps, job);
      else if (job.kind === "edit_nudge_booker") await editNudgeBooker(deps, job);
      else if (job.kind === "edit_flag") await editFlag(deps, job, now);
      else if (job.kind === "rate_ask") await rateAsk(deps, job, now);
      else if (job.kind === "views_ask") await viewsAsk(deps, job, now);
      else if (job.kind === "recap_due") await recapDue(deps, job, now);
      else if (job.kind === "recap") await recap(deps, job, now);
      await deps.store.finishJob(job.id, "done");
    } catch (err) {
      await onFailure(deps, job, err, now);
    }
  }
  return jobs.length;
}

async function deliver(deps: WorkerDeps, account: Account, out: Out[]): Promise<void> {
  await logOut(deps.store, account.id, out);
  if (!account.optedOut) await deps.provider.send(account.phone, out);
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

// ---------- Conversations and bookings (booker script R4–R5, section 4) ----------

const SHOOT_MINUTES = 60;

async function convAndPeople(deps: WorkerDeps, convId: string) {
  const c = await deps.store.conversation(convId);
  if (!c) return null;
  const booker = await deps.store.accountById(c.bookerId);
  const contact = await deps.store.accountById(c.contactId);
  const stop = await deps.store.stop(c.stopId);
  return booker && contact && stop ? { c, booker, contact, stop } : null;
}

/** 12 hours with no answer from the Press Stop: one nudge. */
async function convNudge(deps: WorkerDeps, job: Job): Promise<void> {
  const x = await convAndPeople(deps, (job.payload as { convId: string }).convId);
  if (!x || x.c.status !== "asked") return;
  await deliver(deps, x.contact, [{ ...C.STOP_NUDGE(await bookerLabel(deps.store, x.c), x.c.code), ref: `conv:${x.c.id}` }]);
}

/** 24 hours with no answer: the request expires and the booker can ask someone else. */
async function convExpire(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const x = await convAndPeople(deps, (job.payload as { convId: string }).convId);
  if (!x || x.c.status !== "asked") return;
  x.c.status = "expired";
  await deps.store.saveConversation(x.c);
  await deliver(deps, x.booker, [C.BOOKER_EXPIRED(await stopLabel(deps.store, x.c))]);
  await deliver(deps, x.contact, [C.STOP_EXPIRED(x.c.code)]);
  const req = await deps.store.request(x.c.requestId);
  if (req) await settleRun({ store: deps.store, now }, req);
}

function shootEvent(c: Conversation, title: string, notes: string) {
  return { uid: `${c.id}-${c.shootAt}`, start: new Date(c.shootAt!), minutes: SHOOT_MINUTES, title, place: c.proposal?.place ?? "", notes };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "press-run";

/** The Press Stop's calendar file for one shoot. */
async function stopCalendar(deps: WorkerDeps, job: Job): Promise<void> {
  const x = await convAndPeople(deps, (job.payload as { convId: string }).convId);
  if (!x || x.c.status !== "booked" || !x.c.shootAt) return;
  const talent = await talentNames(deps.store, x.c);
  const ics = icsCalendar([shootEvent(x.c, `${talent} × ${x.stop.seriesName ?? "Press Run"}`, `Booked through Press Run (#${x.c.code}). Text Press Run if anything changes.`)]);
  const name = `${slug(talent)}-${slug(x.stop.seriesName ?? "")}.ics`;
  const url = await deps.files.put(`convs/${x.c.id}/${Date.parse(x.c.shootAt)}-${name}`, new TextEncoder().encode(ics), "text/calendar");
  await deliver(deps, x.contact, [{ type: "file", url, name, mime: "text/calendar", ref: `conv:${x.c.id}` }, C.STOP_CAL]);
}

/** The night before (8pm) and 1 hour before, to both sides. Skipped if the time changed since. */
async function reminder(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { convId: string; kind: "night" | "hour"; shootAt: string };
  // A reminder more than 30 minutes late (the server was down) would only confuse people.
  if ((deps.clock?.() ?? new Date()).getTime() - Date.parse(job.runAfter) > 30 * 60_000) return;
  const x = await convAndPeople(deps, p.convId);
  if (!x || x.c.status !== "booked" || x.c.shootAt !== p.shootAt) return;
  const who = await stopLabel(deps.store, x.c);
  const talent = await talentNames(deps.store, x.c);
  const place = x.c.proposal?.place ?? "place TBD";
  const time = fmtTime(x.c.proposal!.time!);
  if (p.kind === "night") {
    await deliver(deps, x.booker, [C.REMIND_NIGHT_BOOKER(who, time, place)]);
    await deliver(deps, x.contact, [C.REMIND_NIGHT_STOP(talent, time, place)]);
  } else {
    await deliver(deps, x.booker, [C.REMIND_HOUR_BOOKER(who, place)]);
    await deliver(deps, x.contact, [C.REMIND_HOUR_STOP(talent, place)]);
  }
}

/** Every Press Stop asked has answered or expired: the Run Sheet image, a text version and one calendar file. */
async function runSheet(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const ctx = await requestAndBooker(deps, (job.payload as { requestId: string }).requestId);
  if (!ctx) return;
  const { req, account } = ctx;
  const booked = (await deps.store.conversationsForRequest(req.id)).filter(c => c.status === "booked" && c.shootAt).sort((a, b) => a.shootAt!.localeCompare(b.shootAt!));
  if (!booked.length) return;
  const rows = [];
  const events = [];
  for (const c of booked) {
    const stop = (await deps.store.stop(c.stopId))!;
    const talent = await talentNames(deps.store, c);
    rows.push({ day: `${dayName(c.proposal!.date!)} ${fmtDate(c.proposal!.date!)}`, time: fmtTime(c.proposal!.time!), series: stop.seriesName ?? "Press Stop", creator: stop.creatorNames.join(" & ") || "the team", talent, place: c.proposal?.place ?? "Place TBD" });
    events.push(shootEvent(c, `${talent} × ${stop.seriesName ?? "Press Run"}`, `${await stopLabel(deps.store, c)}. Booked through Press Run (#${c.code}).`));
  }
  const firstDate = booked[0]!.proposal!.date!, lastDate = booked[booked.length - 1]!.proposal!.date!;
  const range = dateRange(firstDate, lastDate);
  const forWho = andList([...new Set(rows.map(r => r.talent))]);
  const png = await renderRunSheet(forWho || "Your run", `NYC · ${range} · ${booked.length} Press Stop${booked.length === 1 ? "" : "s"}`, rows);
  const stamp = now.getTime();
  const imgUrl = await deps.files.put(`requests/${req.id}/run-sheet-${stamp}.png`, png, "image/png");
  const name = `${slug(forWho)}-nyc-run.ics`;
  const icsUrl = await deps.files.put(`requests/${req.id}/${stamp}-${name}`, new TextEncoder().encode(icsCalendar(events)), "text/calendar");
  req.runSheetSentAt = now.toISOString();
  await deps.store.saveRequest(req);
  await deliver(deps, account, [
    { type: "image", url: imgUrl, alt: `Run Sheet · ${forWho} · NYC ${range}`, ref: `runsheet:${req.id}` },
    C.RUNSHEET_TEXT(booked.length, range),
    { type: "file", url: icsUrl, name, mime: "text/calendar", ref: `runsheet:${req.id}` },
    C.RUNSHEET_CAL,
  ]);
}

// ---------- After the shoot ----------

const sameShoot = (c: Conversation, shootAt: string) => c.status === "booked" && c.shootAt === shootAt;

/** 6pm on the shoot day: ask the Press Stop for the edit. */
async function shootWrap(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const p = job.payload as { convId: string; shootAt: string };
  const x = await convAndPeople(deps, p.convId);
  if (!x || !sameShoot(x.c, p.shootAt)) return;
  x.c.post ??= { stage: "waiting_edit", edits: [] };
  await deps.store.saveConversation(x.c);
  await deliver(deps, x.contact, [{ ...C.WRAP_STOP(await talentNames(deps.store, x.c)), ref: `conv:${x.c.id}` }]);
  await deps.store.enqueue("edit_nudge_stop", { convId: x.c.id, day: 3 }, new Date(now.getTime() + 3 * 864e5));
  await deps.store.enqueue("edit_nudge_stop", { convId: x.c.id, day: 7 }, new Date(now.getTime() + 7 * 864e5));
  await deps.store.enqueue("recap_due", { requestId: x.c.requestId }, new Date(Date.parse(p.shootAt) + 14 * 864e5));
}

/** No edit 3 days and 7 days after the shoot. After the last nudge the thread is flagged for Courtney. */
async function editNudgeStop(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { convId: string; day: 3 | 7 };
  const x = await convAndPeople(deps, p.convId);
  if (!x || x.c.status !== "booked" || x.c.post?.stage !== "waiting_edit") return;
  const talent = await talentNames(deps.store, x.c);
  await deliver(deps, x.contact, [{ ...(p.day === 3 ? C.EDIT_NUDGE_3D(talent) : C.EDIT_NUDGE_7D(talent)), ref: `conv:${x.c.id}` }]);
  if (p.day === 7) {
    x.contact.needsReview.push({ step: `edit:${x.c.code}`, text: "No edit 7 days after the shoot", at: new Date().toISOString() });
    await deps.store.saveAccount(x.contact);
  }
}

/** The booker hasn't OK'd the edit in 48 hours. */
async function editNudgeBooker(deps: WorkerDeps, job: Job): Promise<void> {
  const p = job.payload as { convId: string; version: number };
  const x = await convAndPeople(deps, p.convId);
  if (!x || x.c.post?.stage !== "in_review" || x.c.post.edits.length !== p.version) return;
  await deliver(deps, x.booker, [{ ...C.EDIT_NUDGE_BOOKER(x.stop.creatorNames.join(" & ") || "The creator"), ref: `conv:${x.c.id}` }]);
}

/** Still no answer at 72 hours: Courtney takes a look (silence doesn't count as approval yet). */
async function editFlag(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const p = job.payload as { convId: string; version: number };
  const x = await convAndPeople(deps, p.convId);
  if (!x || x.c.post?.stage !== "in_review" || x.c.post.edits.length !== p.version) return;
  x.booker.needsReview.push({ step: `edit:${x.c.code}`, text: "Edit not reviewed in 72 hours", at: now.toISOString() });
  await deps.store.saveAccount(x.booker);
}

/** 48 hours after the shoot: the booker rates it 1–5. */
async function rateAsk(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const p = job.payload as { convId: string; shootAt: string };
  const x = await convAndPeople(deps, p.convId);
  if (!x || !sameShoot(x.c, p.shootAt) || x.c.rating !== undefined) return;
  x.c.ratingAskedAt = now.toISOString();
  await deps.store.saveConversation(x.c);
  await deliver(deps, x.booker, [C.RATE_ASK(await stopLabel(deps.store, x.c))]);
}

/** A week after posting: ask the creator for the view count. */
async function viewsAsk(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const x = await convAndPeople(deps, (job.payload as { convId: string }).convId);
  if (!x || x.c.post?.stage !== "posted" || x.c.post.views !== undefined) return;
  x.c.post.viewsAskedAt = now.toISOString();
  await deps.store.saveConversation(x.c);
  await deliver(deps, x.contact, [{ ...C.VIEWS_ASK(await talentNames(deps.store, x.c)), ref: `conv:${x.c.id}` }]);
}

/** 14 days after the last shoot: send the recap with whatever has posted. */
async function recapDue(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const req = await deps.store.request((job.payload as { requestId: string }).requestId);
  if (!req || req.recapSentAt) return;
  const booked = (await deps.store.conversationsForRequest(req.id)).filter(c => c.status === "booked" && c.shootAt);
  const last = Math.max(...booked.map(c => Date.parse(c.shootAt!)));
  if (!booked.length || last + 14 * 864e5 > now.getTime() + 60_000) return; // a later shoot has its own job
  await recap(deps, { ...job, payload: { requestId: req.id, partial: true } }, now);
}

/** The recap image: each stop, its creator, the artist, the platform and views, plus the total. */
async function recap(deps: WorkerDeps, job: Job, now: Date): Promise<void> {
  const p = job.payload as { requestId: string; partial?: boolean };
  const ctx = await requestAndBooker(deps, p.requestId);
  if (!ctx || ctx.req.recapSentAt) return;
  const { req, account } = ctx;
  const all = (await deps.store.conversationsForRequest(req.id)).filter(c => c.status === "booked");
  const posted = all.filter(c => c.post?.stage === "posted" && c.post.postUrl).sort((a, b) => a.shootAt!.localeCompare(b.shootAt!));
  if (!posted.length) {
    account.needsReview.push({ step: `recap:${req.id}`, text: "Nothing posted 14 days after the last shoot", at: now.toISOString() });
    await deps.store.saveAccount(account);
    return;
  }
  const rows = [];
  for (const c of posted) {
    const stop = (await deps.store.stop(c.stopId))!;
    rows.push({ series: stop.seriesName ?? "Press Stop", creator: stop.creatorNames.join(" & ") || "the team", talent: await talentNames(deps.store, c), platform: platformOf(c.post!.postUrl!), views: c.post!.views });
  }
  const total = rows.reduce((sum, r) => sum + (r.views ?? 0), 0);
  const forWho = andList([...new Set(rows.map(r => r.talent))]);
  const range = dateRange(posted[0]!.proposal?.date, posted[posted.length - 1]!.proposal?.date);
  const png = await renderRecap(forWho || "Your run", `NYC · ${range} · ${rows.length} post${rows.length === 1 ? "" : "s"}`, rows, total);
  const url = await deps.files.put(`requests/${req.id}/recap-${now.getTime()}.png`, png, "image/png");
  req.recapSentAt = now.toISOString();
  await deps.store.saveRequest(req);
  const everyone = posted.length === all.length;
  await deliver(deps, account, [
    everyone ? C.RECAP_INTRO : C.RECAP_INTRO_SO_FAR,
    { type: "image", url, alt: `Recap · ${forWho} · NYC ${range}`, ref: `recap:${req.id}` },
    C.RECAP_TOTAL(total, rows.length),
  ]);
}
