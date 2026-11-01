// Slice 2: making the card and clip, sending them for approval, changes, going live.

import { beforeAll, beforeEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/db/store";
import { Engine } from "../src/engine/engine";
import { makeClip, pickStart, probe } from "../src/media/clip";
import { renderEndCard } from "../src/media/card";
import { LocalFiles } from "../src/media/files";
import type { Provider } from "../src/providers/provider";
import type { Inbound, Out } from "../src/types";
import { runJobs } from "../src/worker";

// These tests cut real video with ffmpeg.
setDefaultTimeout(60_000);

let fixture = "";
let filesDir = "";

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "pressrun-test-"));
  fixture = join(dir, "episode.mp4");
  // 60 seconds of test video; the audio is quiet except 0:30–0:50, so that's the stretch to pick.
  const p = Bun.spawn(["ffmpeg", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=60",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=60",
    "-af", "volume='if(between(t,30,50),1,0.02)':eval=frame",
    "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", fixture]);
  expect(await p.exited).toBe(0);
});

let store: Store;
let engine: Engine;
let files: LocalFiles;
let sent: { phone: string; out: Out[] }[];
const provider: Provider = { name: "test", async parseWebhook() { return null; }, async send(phone, out) { sent.push({ phone, out }); } };
const clock = () => new Date("2026-11-01T15:00:00Z");
const PHONE = "+15550002222";

beforeEach(async () => {
  store = await Store.open("sqlite://:memory:");
  engine = new Engine(store, clock);
  filesDir = await mkdtemp(join(tmpdir(), "pressrun-files-"));
  files = new LocalFiles(filesDir, "http://test");
  sent = [];
});

const say = async (text: string, extra: Partial<Inbound> = {}) =>
  (await engine.handle({ phone: PHONE, text, ...extra })).map(o => (o.type === "text" ? o.text : `[${o.type}]`)).join("\n");

const jobs = () => runJobs({ store, provider, files, clock });
const lastSent = () => sent[sent.length - 1]!.out;
const texts = (out: Out[]) => out.map(o => (o.type === "text" ? o.text : `[${o.type}]`));

/** A Press Stop from sign-up to S8, with two attached episodes. */
async function onboardStop(name = "Penny for Your Thoughts") {
  const code = await store.createSignupCode({ name: "Courtney", intent: "stop" });
  await say(`List my show ${code.code}`);
  await say(`${name}, 1`);
  await say("yes");
  await say("IG @penny 30k, TikTok @penny 44k");
  await say("general");
  await say("Union Square, weekday afternoons. Open Nov 12, 14");
  await say("One question, one penny, one honest answer. Free");
  await say("24 hours, text me here");
  await say("ask");
  await say("", { media: [{ kind: "video", url: fixture }, { kind: "video", url: fixture }] });
  await say("yes");
  return say("use a frame");
}

describe("clip maker", () => {
  test("picks the liveliest 18 seconds, skipping the intro", async () => {
    const start = await pickStart(fixture);
    expect(start).toBeGreaterThanOrEqual(30);
    expect(start).toBeLessThanOrEqual(32);
  });

  test("makes an 18-second vertical clip plus the 1-second end card", async () => {
    const { data, start } = await makeClip(fixture, await renderEndCard(), { start: 5 });
    expect(start).toBe(5);
    const path = join(filesDir, "clip.mp4");
    await Bun.write(path, data);
    const info = await probe(path);
    expect(info.hasAudio).toBe(true);
    expect(info.duration).toBeGreaterThan(18.5);
    expect(info.duration).toBeLessThan(19.6);
    expect(data.byteLength).toBeLessThan(10_000_000);
    const p = Bun.spawn(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path], { stdout: "pipe" });
    expect((await new Response(p.stdout).text()).trim()).toBe("720,1280");
  });
});

describe("approval (S8 → S11)", () => {
  test("card and clip arrive for approval, then ❤️ on the card makes it live", async () => {
    expect(await onboardStop()).toContain("Making your card and sample clip now 🎬");
    expect(await say("hello?")).toBe("Still working on your clip. Almost there.");

    expect(await jobs()).toBe(1);
    const out = lastSent();
    expect(texts(out)).toEqual(["Here's how bookers will see Penny for Your Thoughts 👇", "[image]", "[video]", expect.stringContaining('Reply "looks good"')]);
    const card = out[1] as Extract<Out, { type: "image" }>;
    expect(card.url).toMatch(/^http:\/\/test\/files\/stops\/.+\/card-v1\.png$/);
    expect(await Bun.file(join(filesDir, card.url.replace("http://test/files/", ""))).exists()).toBe(true);

    const account = (await store.accountByPhone(PHONE))!;
    expect(account.step).toBe("S10");
    const [stop] = await store.stopsByOwner(account.id);
    expect(stop).toMatchObject({ status: "pending_approval", media: { version: 1, episode: 0 } });

    const msgs = await store.messagesFor(account.id);
    const cardMsg = msgs.find(m => m.kind === "image")!;
    const r = await say("", { reaction: { emoji: "❤️", targetProviderId: cardMsg.id, removed: false } });
    expect(r).toContain("You're live as a Press Stop ✅ Bookers in NYC can now find Penny for Your Thoughts.");
    expect(r).toContain("[contact]");
    expect(r).toContain("Do you ever book guests on other shows");
    expect((await store.stop(stop!.id))!.status).toBe("live");

    expect(await say("YES")).toContain("who are you booking for?");
  });

  test("changes: rate re-renders the card; a new clip start re-cuts both (cover is a frame)", async () => {
    await onboardStop();
    await jobs();
    expect(await say("rate 300-500")).toBe("");
    await jobs();
    expect(texts(lastSent())).toEqual(["Updated 👇", "[image]"]);
    const account = (await store.accountByPhone(PHONE))!;
    let [stop] = await store.stopsByOwner(account.id);
    expect(stop!.rateText).toBe("$300–$500");

    await say("start at 0:40");
    await jobs();
    expect(texts(lastSent())).toEqual(["Updated 👇", "[image]", "[video]"]);
    [stop] = await store.stopsByOwner(account.id);
    expect(stop!.media).toMatchObject({ clipStart: 40, version: 3 });

    await say("use the 2nd episode");
    await jobs();
    [stop] = await store.stopsByOwner(account.id);
    expect(stop!.media!.episode).toBe(1);

    expect(await say("looks good")).toContain("You're live as a Press Stop ✅");
  });

  test("👎 asks what to change; a fourth round of changes goes to Courtney", async () => {
    await onboardStop();
    await jobs();
    const account = (await store.accountByPhone(PHONE))!;
    const clipMsg = (await store.messagesFor(account.id)).find(m => m.kind === "video")!;
    expect(await say("", { reaction: { emoji: "👎", targetProviderId: clipMsg.id, removed: false } })).toBe("What should I change about the clip?");
    await say("rate 100");
    await say("rate 200");
    await say("rate 300");
    expect(await say("rate 400")).toBe("Let me get Courtney to make this perfect. She'll text you today.");
    expect((await store.accountByPhone(PHONE))!.needsHuman).toBe(true);
  });

  test("a sample link that can't be opened sends them back to attach the video", async () => {
    const code = await store.createSignupCode({ name: "Courtney", intent: "stop" });
    for (const m of [`List my show ${code.code}`, "Movies for a Minute, 1", "yes", "IG @movies 18k", "2", "Bryant Park, Saturdays. Open Nov 15", "Film talk, $150-300", "1 week, here", "no"]) await say(m);
    await say("instagram.com/reel/abc123");
    await say("yes");
    await say("use a frame");
    await jobs();
    expect(texts(lastSent())).toEqual(["I couldn't open that one (https://instagram.com/reel/abc123). Is it private? You can also attach the video here."]);
    expect((await store.accountByPhone(PHONE))!.step).toBe("S6");
    expect(await say("", { media: [{ kind: "video", url: fixture }] })).toContain("you own these");
  });
});
