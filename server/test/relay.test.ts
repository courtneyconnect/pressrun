// Slice 4: passing messages between a booker and Press Stops, booking, the Run
// Sheet, calendar files and reminders (booker script R4–R5 and section 4).

import { beforeEach, describe, expect, setDefaultTimeout, test } from "bun:test";

setDefaultTimeout(60_000);
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/db/store";
import { Engine } from "../src/engine/engine";
import { LocalFiles } from "../src/media/files";
import type { Provider } from "../src/providers/provider";
import type { Inbound, Out, PressStop } from "../src/types";
import { hideContacts } from "../src/run/relay";
import { dateInWindow, icsCalendar, nyToUtc, parseTime, placeFrom } from "../src/run/time";
import { runJobs } from "../src/worker";

let store: Store;
let engine: Engine;
let files: LocalFiles;
let dir: string;
let now: Date;
const provider: Provider = { name: "test", async parseWebhook() { return null; }, async send() {} };
const BOOKER = "+15550003333";
const COURTNEY = "+15550009999";
const TEAMMATE = "+15550007777";
let bookerId = "";
let ownerId = "";
let mfm: PressStop, penny: PressStop, movies: PressStop;

beforeEach(async () => {
  store = await Store.open("sqlite://:memory:");
  now = new Date("2026-11-01T15:00:00Z");
  engine = new Engine(store, () => now);
  dir = await mkdtemp(join(tmpdir(), "pressrun-relay-"));
  files = new LocalFiles(dir, "http://test");
  const owner = await store.createAccount(COURTNEY, { firstName: "Courtney", roles: ["stop"] });
  ownerId = owner.id;
  const booker = await store.createAccount(BOOKER, { firstName: "Dana", roles: ["booker"] });
  bookerId = booker.id;
  await store.saveBooker(bookerId, {
    role: "manager", extraRoles: [], handles: [], nicheTags: ["r&b"], stopTypes: ["street", "podcast"],
    hardNos: [], interests: [], city: "New York", budgetLow: 0, budgetHigh: 1000, budgetText: "up to $1k",
  });
  await store.addTalent(bookerId, { name: "Nova Reign", handles: [{ platform: "instagram", handle: "@novareign", url: "https://instagram.com/novareign" }], nicheText: "R&B", interests: ["music"] });
  const base: Partial<PressStop> = { status: "live", creatorNames: ["Courtney"], format: "street", placesText: "Manhattan", rateLow: 0, rateHigh: 0, rateText: "Free", noticeHours: 24, general: true };
  mfm = await addStop({ ...base, seriesName: "Music for a Minute", interests: ["music"], audienceTotal: 169000, openDates: ["2026-11-12", "2026-11-13"] });
  penny = await addStop({ ...base, seriesName: "Penny for Your Thoughts", audienceTotal: 74000, openDates: ["2026-11-12", "2026-11-14"], bookingContact: { self: false, name: "Sam Lee", phone: TEAMMATE } });
  movies = await addStop({ ...base, seriesName: "Movies for a Minute", interests: [], audienceTotal: 41000, openDates: ["2026-11-14"], rateLow: 150, rateHigh: 300, rateText: "$150–$300" });
});

async function addStop(fields: Partial<PressStop>): Promise<PressStop> {
  const s = await store.createStop(ownerId);
  Object.assign(s, { media: { version: 1, clipUrl: "http://test/files/clip.mp4" }, ...fields });
  await store.saveStop(s);
  return s;
}

const show = (o: Out) => (o.type === "text" ? o.text : o.type === "link" ? `[link ${o.url}]` : o.type === "file" ? `[file ${o.name}]` : `[${o.type}]`);
/** Each text arrives a minute after the last, like a real thread. */
const say = async (phone: string, text: string, extra: Partial<Inbound> = {}) => {
  now = new Date(now.getTime() + 60_000);
  const out = (await engine.handle({ phone, text, ...extra })).map(show).join("\n");
  seen.set(phone, await outCount(phone));
  return out;
};
/** Replies to the sender aren't part of their inbox (inbox shows what arrived from elsewhere). */
async function outCount(phone: string) {
  const a = (await store.accountByPhone(phone))!;
  return (await store.messagesFor(a.id)).filter(m => m.direction === "out").length;
}
const jobs = () => runJobs({ store, provider, files, clock: () => now });

/** Everything Press Run sent a phone since the last call (or since the start). */
const seen = new Map<string, number>();
async function inbox(phone: string): Promise<string[]> {
  const a = (await store.accountByPhone(phone))!;
  const msgs = (await store.messagesFor(a.id)).filter(m => m.direction === "out");
  const from = seen.get(phone) ?? 0;
  seen.set(phone, msgs.length);
  return msgs.slice(from).map(m => m.kind === "text" ? m.body! : m.kind === "link" ? `[link ${(m.data as { url: string }).url}]` : m.kind === "file" ? `[file ${(m.data as { name: string }).name}]` : m.kind === "image" ? `[image ${(m.data as { alt: string }).alt}]` : `[${m.kind}]`);
}

/** Ask for a run, shortlist Music for a Minute (1) and Penny (2), send the requests. */
async function askTwo() {
  seen.clear();
  await say(BOOKER, "NYC Nov 12–14 for Nova, give me my options");
  await jobs();
  await inbox(BOOKER);
  const req = (await store.openRequest(bookerId))!;
  const n = (s: PressStop) => req.options.find(o => o.stopId === s.id)!.number;
  expect(await say(BOOKER, `${n(mfm)} and ${n(penny)}`)).toContain("Want me to ask about dates?");
  return say(BOOKER, "yes");
}

describe("helpers", () => {
  test("times, places, dates in the window", () => {
    expect(parseTime("YES Thu Nov 13, 2:30pm, Washington Sq Park")).toBe("14:30");
    expect(parseTime("noon works")).toBe("12:00");
    expect(parseTime("12am")).toBe("00:00");
    expect(placeFrom("YES Thu Nov 13, 2:30pm, Washington Square Park (arch side). Can she bring the single?")).toBe("Washington Square Park (arch side)");
    expect(dateInWindow("Friday at 3pm", now, "2026-11-12", "2026-11-15")).toBe("2026-11-13");
    expect(nyToUtc("2026-11-13", "14:30").toISOString()).toBe("2026-11-13T19:30:00.000Z"); // EST
    expect(nyToUtc("2026-07-01", "14:30").toISOString()).toBe("2026-07-01T18:30:00.000Z"); // EDT
  });

  test("numbers and emails are hidden", () => {
    const r = hideContacts("text me at 917-555-0142 or dana@novamgmt.com");
    expect(r.text).toBe("text me at [number hidden by Press Run] or [number hidden by Press Run]");
    expect(r.hidden).toEqual(["dana@novamgmt.com", "917-555-0142"]);
    expect(hideContacts("Thu Nov 13, 2:30pm").hidden).toEqual([]);
  });

  test("calendar file", () => {
    const ics = icsCalendar([{ uid: "a", start: new Date("2026-11-13T19:30:00Z"), minutes: 60, title: "Nova Reign × Music for a Minute", place: "Washington Sq Park, arch side", notes: "x" }]);
    expect(ics).toContain("DTSTART:20261113T193000Z");
    expect(ics).toContain("DTEND:20261113T203000Z");
    expect(ics).toContain("LOCATION:Washington Sq Park\\, arch side");
  });
});

describe("R4: sending requests", () => {
  test("ask with nothing shortlisted", async () => {
    await say(BOOKER, "NYC Nov 12–14 for Nova, give me my options");
    await jobs();
    expect(await say(BOOKER, "ask them")).toBe("Which ones? Reply with numbers, or ❤️ a card first.");
  });

  test("each Press Stop gets the request in its own thread, with the artist's link", async () => {
    expect(await askTwo()).toBe("Sent 🙌 I asked Courtney from Music for a Minute and Penny for Your Thoughts about Nov 12–14. I'll pass their replies here, usually within a few hours.");
    expect(await inbox(COURTNEY)).toEqual([
      "📩 New booking request #PR-1042\nNova Reign (R&B, @novareign) for Music for a Minute\nDates: Nov 12–14, NYC · Rate: free",
      "[link https://instagram.com/novareign]",
      "Reply YES with a day/time/location, NO to pass, or type a question and I'll pass it on.",
    ]);
    // Penny's booking contact is a teammate, who gets it instead of Courtney.
    expect((await inbox(TEAMMATE))[0]).toStartWith("📩 New booking request #PR-1043\nNova Reign (R&B, @novareign) for Penny for Your Thoughts");
    expect(await say(BOOKER, "ask them")).toBe("Which ones? Reply with numbers, or ❤️ a card first.");
  });
});

describe("R4: relaying", () => {
  beforeEach(async () => { await askTwo(); await inbox(BOOKER); await inbox(COURTNEY); await inbox(TEAMMATE); });

  test("YES with no details asks for them; a NO tells the booker", async () => {
    expect(await say(COURTNEY, "yes!")).toBe('What day, time and place work? e.g. "Thu Nov 13, 2:30pm, Washington Sq Park"');
    expect(await say(TEAMMATE, "no, we're booked up that week")).toBe("No worries, I'll let them know.");
    expect(await inbox(BOOKER)).toEqual(["Courtney from Penny for Your Thoughts can't make those dates. Want me to ask someone else?"]);
  });

  test("a time goes to the booker with the sender's label; lock it books both sides", async () => {
    expect(await say(COURTNEY, "YES Fri Nov 13, 2:30pm, Washington Square Park (arch side). Can she bring the single?")).toBe("Sent to Nova Reign's team ✅");
    expect(await inbox(BOOKER)).toEqual([
      "💬 Courtney from Music for a Minute: Fri Nov 13, 2:30pm, Washington Square Park (arch side). Can she bring the single?",
      'Reply to answer, or "lock it" to book that time.',
    ]);
    // Two conversations are open, but the booker's reply goes to the one that just wrote.
    expect(await say(BOOKER, "yes she'll bring it. lock it")).toBe("Booked ✅ Courtney from Music for a Minute · Fri Nov 13, 2:30pm · Washington Square Park (arch side)\nI'll send your full Run Sheet once the other Press Stops confirm.");
    expect(await inbox(COURTNEY)).toEqual([
      "💬 Nova Reign's team: yes she'll bring it. lock it",
      "Booked ✅ Nova Reign · Fri Nov 13, 2:30pm · Washington Square Park (arch side). I'll send reminders.",
    ]);
    await jobs();
    expect(await inbox(COURTNEY)).toEqual(["[file nova-reign-music-for-a-minute.ics]", "Tap the calendar file to add it to your calendar."]);
    const c = (await store.conversationsFor(bookerId))[0]!;
    expect(c.status).toBe("booked");
    expect(c.shootAt).toBe("2026-11-13T19:30:00.000Z");
  });

  test("lock it before a time, questions both ways, which conversation", async () => {
    expect(await say(BOOKER, "lock it")).toBe("Is this for Courtney from Music for a Minute or Courtney from Penny for Your Thoughts?");
    expect(await say(BOOKER, "Music for a Minute: lock it")).toBe("Courtney from Music for a Minute hasn't suggested a time yet. I'll pass it on when they do.");
    expect(await say(TEAMMATE, "Does Nova have a new single out?")).toBe("Sent to Nova Reign's team ✅");
    expect(await inbox(BOOKER)).toEqual(["💬 Courtney from Penny for Your Thoughts: Does Nova have a new single out?"]);
    expect(await say(BOOKER, "Yes, Midnight Drive drops Friday")).toBe("");
    expect(await inbox(TEAMMATE)).toEqual(["💬 Nova Reign's team: Yes, Midnight Drive drops Friday"]);
    // A reply to a specific bubble goes to that conversation.
    const courtneyMsg = (await store.messagesFor((await store.accountByPhone(BOOKER))!.id)).find(m => m.direction === "out" && m.body?.includes("Penny"))!;
    expect(await say(BOOKER, "she can do any afternoon", { replyToProviderId: courtneyMsg.id })).toBe("");
    expect(await inbox(TEAMMATE)).toEqual(["💬 Nova Reign's team: she can do any afternoon"]);
  });

  test("numbers stay hidden until SHARE", async () => {
    await say(COURTNEY, "Thu Nov 12 at 4pm in Bryant Park?");
    await inbox(BOOKER);
    expect(await say(BOOKER, "Music for a Minute: works, call me 917-555-0142 when you're there")).toBe("I hid your number in what I passed on. Reply SHARE if you want Courtney from Music for a Minute to have it.");
    expect(await inbox(COURTNEY)).toEqual(["💬 Nova Reign's team: Music for a Minute: works, call me [number hidden by Press Run] when you're there"]);
    expect(await say(BOOKER, "SHARE")).toBe("Shared ✅ Courtney from Music for a Minute can see your number now.");
    expect(await inbox(COURTNEY)).toEqual(["📞 Nova Reign's team shared their number: 917-555-0142"]);
    expect(await say(BOOKER, "share")).toBe("There's no hidden number to share right now.");
  });

  test("12-hour nudge and 24-hour expiry", async () => {
    await say(TEAMMATE, "no thanks");
    await inbox(BOOKER);
    now = new Date(now.getTime() + 12 * 36e5 + 1000);
    await jobs();
    expect(await inbox(COURTNEY)).toEqual(["Nova Reign's team is waiting on #PR-1042. YES with a day/time/location, or NO?"]);
    now = new Date(now.getTime() + 12 * 36e5);
    await jobs();
    expect(await inbox(COURTNEY)).toEqual(["#PR-1042 expired. No worries."]);
    expect(await inbox(BOOKER)).toEqual(["Courtney from Music for a Minute didn't get back in time. Want me to ask someone else?"]);
  });
});

describe("R5: Run Sheet and reminders", () => {
  test("Run Sheet after every stop answers; reminders; late; a changed time", async () => {
    await askTwo();
    await say(COURTNEY, "YES Fri Nov 13, 2:30pm, Washington Square Park");
    await say(BOOKER, "lock it");
    await say(TEAMMATE, "Sat Nov 14 11am, our studio in Bed-Stuy");
    await jobs();
    await inbox(BOOKER);
    expect(await say(BOOKER, "perfect")).toBe("Booked ✅ Courtney from Penny for Your Thoughts · Sat Nov 14, 11am · our studio in Bed-Stuy");
    await jobs();
    const sheet = await inbox(BOOKER);
    expect(sheet).toEqual([
      "[image Run Sheet · Nova Reign · NYC Nov 13–14]",
      'Your run: 2 Press Stops, Nov 13–14. I\'ll text call times the night before and 1 hour before each one. Reply "change" if anything moves.',
      "[file nova-reign-nyc-run.ics]",
      "Tap the calendar file to add every stop to your calendar in one go.",
    ]);
    const ics = await readFile(join(dir, (await store.messagesFor(bookerId)).filter(m => m.kind === "file").pop()!.data!.url!.toString().replace("http://test/files/", "")), "utf8");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);

    // Night before (Nov 12, 8pm New York = Nov 13 01:00 UTC) and 1 hour before.
    await inbox(COURTNEY);
    now = new Date("2026-11-13T01:00:30Z");
    await jobs();
    expect(await inbox(BOOKER)).toEqual(['Tomorrow: Courtney from Music for a Minute at 2:30pm, Washington Square Park. Reply "late" if you\'re running behind.']);
    expect(await inbox(COURTNEY)).toEqual(["Tomorrow: Nova Reign at 2:30pm, Washington Square Park."]);
    now = new Date("2026-11-13T18:30:30Z");
    await jobs();
    expect(await inbox(BOOKER)).toEqual(["Courtney from Music for a Minute in 1 hour 📍 Washington Square Park"]);
    expect(await say(BOOKER, "Music for a Minute running 10 min late")).toBe("Told Courtney from Music for a Minute. You're good 👍");
    expect(await inbox(COURTNEY)).toEqual(["Nova Reign in 1 hour 📍 Washington Square Park", "💬 Nova Reign's team: running about 10 min late."]);

    // Penny moves the time: the booker can lock the new one, and the old reminders are skipped.
    await say(TEAMMATE, "Can we do Sat Nov 14 at 1pm instead?");
    expect(await inbox(BOOKER)).toEqual(["💬 Courtney from Penny for Your Thoughts: Can we do Sat Nov 14 at 1pm instead?", 'Reply to answer, or "lock it" to book that time.']);
    expect(await say(BOOKER, "Penny: lock it")).toBe("Booked ✅ Courtney from Penny for Your Thoughts · Sat Nov 14, 1pm · our studio in Bed-Stuy");
    await jobs();
    expect((await inbox(BOOKER))[0]).toBe("[image Run Sheet · Nova Reign · NYC Nov 13–14]");
    expect(await inbox(TEAMMATE)).toContain("[file nova-reign-penny-for-your-thoughts.ics]");
    now = new Date("2026-11-14T01:00:30Z"); // 8pm the night before: one reminder, for the new time
    await jobs();
    expect(await inbox(BOOKER)).toEqual(['Tomorrow: Courtney from Penny for Your Thoughts at 1pm, our studio in Bed-Stuy. Reply "late" if you\'re running behind.']);
    now = new Date("2026-11-14T15:00:30Z"); // 1 hour before the old 11am: nothing
    await jobs();
    expect(await inbox(BOOKER)).toEqual([]);
    now = new Date("2026-11-14T17:00:30Z"); // 1 hour before 1pm
    await jobs();
    expect(await inbox(BOOKER)).toEqual(["Courtney from Penny for Your Thoughts in 1 hour 📍 our studio in Bed-Stuy"]);
  });
});
