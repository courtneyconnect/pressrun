// Slice 3: a booker asks for a run and picks from numbered options (booker script R1–R3).

import { beforeEach, describe, expect, setDefaultTimeout, test } from "bun:test";

// These render real cards.
setDefaultTimeout(60_000);
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/db/store";
import { Engine } from "../src/engine/engine";
import { LocalFiles } from "../src/media/files";
import type { Provider } from "../src/providers/provider";
import type { Inbound, Out, PressStop } from "../src/types";
import { runJobs } from "../src/worker";

let store: Store;
let engine: Engine;
let files: LocalFiles;
let now: Date;
let sent: Out[][];
const provider: Provider = { name: "test", async parseWebhook() { return null; }, async send(_p, out) { sent.push(out); } };
const PHONE = "+15550003333";
let bookerId = "";
let ownerId = "";

beforeEach(async () => {
  store = await Store.open("sqlite://:memory:");
  now = new Date("2026-11-01T15:00:00Z");
  engine = new Engine(store, () => now);
  files = new LocalFiles(await mkdtemp(join(tmpdir(), "pressrun-run-")), "http://test");
  sent = [];
  const owner = await store.createAccount("+15550009999", { firstName: "Courtney", roles: ["stop"] });
  ownerId = owner.id;
  const booker = await store.createAccount(PHONE, { firstName: "Dana", roles: ["booker"] });
  bookerId = booker.id;
  await store.saveBooker(bookerId, {
    role: "manager", extraRoles: [], handles: [], nicheTags: ["r&b", "hip-hop"], stopTypes: ["street", "creator_features", "podcast"],
    hardNos: ["prank"], interests: [], city: "New York", budgetLow: 1000, budgetHigh: 5000, budgetText: "$1k–$5k",
  });
  await store.addTalent(bookerId, { name: "Nova Reign", handles: [], nicheText: "R&B", interests: ["movies", "sneakers"] });
  await store.addTalent(bookerId, { name: "Jay Mo", handles: [], nicheText: "drill", interests: ["gaming", "sports", "cards"] });
});

async function addStop(fields: Partial<PressStop>): Promise<PressStop> {
  const s = await store.createStop(ownerId);
  Object.assign(s, {
    status: "live", creatorNames: ["Courtney"], format: "street", placesText: "Manhattan", openDates: ["2026-11-12", "2026-11-13", "2026-11-15"],
    rateLow: 0, rateHigh: 0, rateText: "Free", noticeHours: 48, audienceTotal: 50000, general: true,
    media: { version: 1, clipUrl: `http://test/files/${fields.seriesName}.mp4` }, ...fields,
  });
  await store.saveStop(s);
  return s;
}

async function fourStops() {
  await addStop({ seriesName: "Music for a Minute", interests: ["music"], audienceTotal: 169000, fullEpisodeLinks: ["https://instagram.com/reel/mfm-ep41"], deliverableText: "60-sec street interview on IG + TikTok" });
  await addStop({ seriesName: "Penny for Your Thoughts", interests: [], audienceTotal: 74000, openDates: ["2026-11-12", "2026-11-14"] });
  await addStop({ seriesName: "Motivation for a Minute", interests: ["motivation", "fitness"], general: false, audienceTotal: 58000, openDates: ["2026-11-13", "2026-11-14"] });
  await addStop({ seriesName: "Movies for a Minute", interests: ["movies", "comedy"], general: false, audienceTotal: 41000, rateLow: 150, rateHigh: 300, rateText: "$150–$300", openDates: ["2026-11-15"], noticeHours: 168 });
}

const say = async (text: string, extra: Partial<Inbound> = {}) =>
  (await engine.handle({ phone: PHONE, text, ...extra })).map(o => (o.type === "text" ? o.text : `[${o.type}]`)).join("\n");
const jobs = () => runJobs({ store, provider, files, clock: () => now });
const flat = () => sent.flat().map(o => (o.type === "text" ? o.text : o.type === "image" ? `[image ${o.alt}]` : `[${o.type}]`));

describe("R1: reading the request", () => {
  test("a full request goes straight to options, interest matches ranked up and named", async () => {
    await fourStops();
    expect(await say("NYC Nov 12–15, 2 artists, $5k budget, give me my options")).toBe("On it: NYC, Thu Nov 12 – Sun Nov 15, for Nova Reign and Jay Mo, up to $5k. Pulling Press Stops now…");
    await jobs();
    const out = flat();
    expect(out.filter(o => o.startsWith("[image"))).toHaveLength(4);
    expect(out.filter(o => o === "[video]")).toHaveLength(4);
    expect(out[0]).toBe("[image 1 · Movies for a Minute]");
    expect(out[out.length - 1]).toBe('That\'s 4 Press Stops, $150–$300 total if you book all of them. 1 is an interest match for Nova (🎬 movies & tv). Reply with numbers ("1 and 3"), react to a card, or ask "cheaper", "more like 2", or "who\'s free Thursday?"');
  });

  test("notice: too close to a Press Stop's notice leaves it out", async () => {
    await fourStops();
    now = new Date("2026-11-10T15:00:00Z"); // Movies for a Minute needs a week before Nov 15
    await say("NYC Nov 12–15, 2 artists, $5k budget, give me my options");
    await jobs();
    const out = flat();
    expect(out.filter(o => o.startsWith("[image"))).toHaveLength(3);
    expect(out[out.length - 1]).toContain("That's 3 Press Stops, all free.");
  });

  test("missing dates, then 'next week'", async () => {
    await fourStops();
    expect(await say("give me my options, 2 artists")).toBe('Which dates? e.g. "Nov 12–15" or "next week".');
    expect(await say("Nov 12-13")).toContain("Using your usual $1k–$5k budget.");
  });

  test("a manager who doesn't say who it's for", async () => {
    await fourStops();
    expect(await say("NYC Nov 12-15 options")).toBe("For who: Nova Reign, Jay Mo, or all?");
    expect(await say("just Nova")).toContain("for Nova Reign,");
  });

  test("a city that isn't live yet, and a date that already passed", async () => {
    await fourStops();
    expect(await say("LA Nov 12-15, both artists, give me options")).toBe("I don't have Press Stops in LA yet, but I'll text you when it opens. Want options in NYC instead?");
    expect(await say("yes")).toContain("On it: NYC");
    expect(await say("Oct 20, both, give me my options")).toBe("Oct 20 has already passed. Did you mean next year, or another date?");
  });

  test("hard no's and notice are respected", async () => {
    await addStop({ seriesName: "Prank Patrol", deliverableText: "street prank interviews" });
    await addStop({ seriesName: "Tomorrow Show", openDates: ["2026-11-02"], noticeHours: 72 });
    await say("NYC Nov 2–15, both, options");
    await jobs();
    expect(flat()).toEqual(["No Press Stops fit those dates and budget yet. Want me to widen the dates or include paid Press Stops?"]);
  });
});

describe("R3: picking", () => {
  beforeEach(async () => {
    await fourStops();
    now = new Date("2026-10-20T15:00:00Z");
    await say("NYC Nov 12–15, 2 artists, $5k budget, give me my options");
    await jobs();
    sent = [];
  });

  const cardFor = async (n: number) => (await store.messagesFor(bookerId)).find(m => m.kind === "image" && (m.data as { alt?: string })?.alt?.startsWith(`${n} ·`))!;

  test("by reply, with the creator credited", async () => {
    expect(await say("1 and 3")).toBe("Shortlisted 1 and 3, Courtney from Movies for a Minute and Penny for Your Thoughts. Want me to ask about dates?");
    expect(await say("the Music for a Minute one")).toContain("Shortlisted 2, Courtney from Music for a Minute.");
    expect(await say("7")).toBe("I only sent 1–4. Which ones?");
  });

  test("❤️ adds quietly; one summary after 30 quiet seconds", async () => {
    expect(await say("", { reaction: { emoji: "❤️", targetProviderId: (await cardFor(1)).id, removed: false } })).toBe("");
    expect(await say("", { reaction: { emoji: "🔥", targetProviderId: (await cardFor(3)).id, removed: false } })).toBe("");
    await jobs();
    expect(flat()).toEqual([]);
    now = new Date(now.getTime() + 31_000);
    await jobs();
    expect(flat()).toEqual(["Shortlist: 1 and 3 ✅"]);
  });

  test("👎 drops it and remembers; ❓ sends details; full episode", async () => {
    expect(await say("", { reaction: { emoji: "👎", targetProviderId: (await cardFor(1)).id, removed: false } })).toBe("Dropped 1. I'll show fewer like it.");
    expect((await store.booker(bookerId)).fewerFormats).toEqual(["street"]);
    const details = await say("", { reaction: { emoji: "❓", targetProviderId: (await cardFor(2)).id, removed: false } });
    expect(details).toContain("Music for a Minute, hosted by Courtney: 60-sec street interview on IG + TikTok");
    expect(details).toContain("Reply “full episode 2” to watch the whole thing.");
    expect(await say("full episode 2")).toBe("Here's the full episode from Courtney from Music for a Minute 👇\n[link]");
    expect(await say("full episode 3")).toBe("Courtney from Penny for Your Thoughts hasn't added a full episode yet. Want me to ask?");
  });

  test("who's free Thursday, cheaper, ask them", async () => {
    expect(await say("who's free Thursday?")).toBe("Thursday Nov 12: 2 and 3 (Courtney from Music for a Minute and Penny for Your Thoughts).\nNobody else is free Thursday Nov 12.");
    expect(await say("cheaper")).toBe("These are the cheapest I've got for those dates.");
    expect(await say("ask them")).toBe("Got it. Sending your request to the Press Stops arrives in the next build.");
  });
});

describe("R2: lots of matches → master list", () => {
  test("list image, then numbers, 'show me all' and 'more'", async () => {
    for (let i = 1; i <= 8; i++) await addStop({ seriesName: `Street Show ${i}`, audienceTotal: 10000 * i, format: i % 2 ? "street" : "podcast" });
    await say("NYC Nov 12–15, both artists, options");
    await jobs();
    expect(flat()).toEqual(["8 Press Stops fit 🔥 Here's the full list 👇", "[image Master list: 8 Press Stops]", expect.stringContaining('Reply with the numbers you want to see')]);
    sent = [];
    expect(await say("2, 5")).toBe("");
    await jobs();
    expect(flat()).toEqual(["[image 2 · Street Show 7]", "[video]", "[image 5 · Street Show 4]", "[video]"]);
    sent = [];
    await say("show me all");
    await jobs();
    expect(flat().filter(o => o.startsWith("[image"))).toHaveLength(5);
    expect(flat()[flat().length - 1]).toBe('That\'s 1–5. Reply "more" for the next 5.');
    sent = [];
    await say("more");
    await jobs();
    expect(flat().filter(o => o.startsWith("[image"))).toHaveLength(3);
    sent = [];
    expect(await say("only podcasts")).toBe("Already sent: 1, 3, 5 and 7.");
  });
});
