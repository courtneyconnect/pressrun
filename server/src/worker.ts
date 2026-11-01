// Background jobs: making a Press Stop's card and clip (S8 → S9) and remaking
// them after a change request (S10). Runs in the same process on a timer.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Job, Store } from "./db/store";
import * as C from "./engine/copy";
import { renderCard, renderEndCard } from "./media/card";
import { fetchSample, grabFrame, makeClip, SampleUnavailable } from "./media/clip";
import type { FileStore } from "./media/files";
import { logOut } from "./outbox";
import type { Provider } from "./providers/provider";
import type { Account, Out, PressStop } from "./types";

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

async function coverDataUrl(deps: WorkerDeps, stop: PressStop): Promise<string | undefined> {
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
