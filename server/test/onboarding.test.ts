// Replays the conversations from the clickable mockup against the real engine.

import { beforeEach, describe, expect, test } from "bun:test";
import { Store } from "../src/db/store";
import { Engine } from "../src/engine/engine";
import type { Inbound } from "../src/types";

let store: Store;
let engine: Engine;
let clock = new Date("2026-11-01T15:00:00Z");

beforeEach(async () => {
  store = await Store.open("sqlite://:memory:");
  clock = new Date("2026-11-01T15:00:00Z");
  engine = new Engine(store, () => clock);
});

const PHONE = "+15550001111";

/** Sends a text and returns Press Run's reply bubbles joined, one per line. */
async function text(body: string, phone = PHONE, extra: Partial<Inbound> = {}): Promise<string> {
  const out = await engine.handle({ phone, text: body, ...extra });
  return out.map(o => (o.type === "text" ? o.text : `[${o.type}]`)).join("\n---\n");
}

describe("booker onboarding (mockup chapter 1)", () => {
  test("manager with two artists, from a website sign-up code", async () => {
    const code = await store.createSignupCode({ name: "Courtney", email: "c@example.com", intent: "booker" });

    let r = await text(`Hey Press Run 👋 Sign me up. Code ${code.code}`);
    expect(r).toContain("Welcome to Press Run, Courtney. You're Member #0001 🎟️");
    expect(r).toContain("you pay NO Press Run service fees for 12 months after they start");
    expect(r).toContain("who are you booking for?");

    r = await text("2");
    expect(r).toContain("Who's on your roster?");

    r = await text("Nova Reign @novareign\nJay Mo tiktok.com/@jaymo.nyc");
    expect(r).toContain("If it's different per artist, put it next to each name.");

    r = await text("Nova is R&B, Jay is drill");
    expect(r).toContain("What kind of Press Stops do you want for your artists?");

    r = await text("1, 2 and 3. Nova's single drops Nov 14");
    expect(r).toContain("What's Nova Reign into outside of music?");
    expect(r).toContain("18 📸 Photography");

    r = await text("2 and 6");
    expect(r).toBe("And Jay Mo?");

    r = await text("🎮 🏀 and he collects sports cards");
    expect(r).toContain("What do you usually spend on a full run?");

    r = await text("depends lol");
    expect(r).toBe("Ballpark is fine. Closer to free, under $1k, or more?");

    r = await text("1-5k usually");
    expect(r).toContain("Any Press Stops you'd never do?");

    r = await text("no prank shows. nothing before 11");
    expect(r).toContain("where are you based?");

    r = await text("Brooklyn");
    expect(r).toContain("NYC 🗽 perfect.");
    expect(r).toContain("You're set, Courtney ✅");
    expect(r).toContain("• Booking for: Nova Reign (R&B), Jay Mo (drill)");
    expect(r).toContain("• Looking for: street interviews, creator features and collabs, podcasts");
    expect(r).toContain("• Into: Nova 🎬 👟 · Jay 🎮 🏀 🃏");
    expect(r).toContain("• Budget: $1k–$5k");
    expect(r).toContain("[contact]");
    expect(r).toContain("do you also run a show");

    r = await text("yes but later, I'll list my shows next");
    expect(r).toContain("No rush. Text “list my show” anytime");
    expect(r).toContain("Here's how it works.");
    expect(r).toContain("You mentioned Nova's single on Nov 14.");

    const a = (await store.accountByPhone(PHONE))!;
    expect(a.flow).toBeNull();
    const p = await store.booker(a.id);
    expect(p.role).toBe("manager");
    expect(p.budgetLow).toBe(1000);
    expect(p.budgetHigh).toBe(5000);
    expect(p.hardNos).toEqual(["prank", "mornings"]);
    expect(p.city).toBe("New York");
    expect(p.upcomingRelease?.date).toBe("2026-11-14");
    const talent = await store.talentFor(a.id);
    expect(talent.map(t => t.name)).toEqual(["Nova Reign", "Jay Mo"]);
    expect(talent[1]!.handles[0]).toEqual({ platform: "tiktok", handle: "@jaymo.nyc", url: "https://tiktok.com/@jaymo.nyc" });
    expect(talent[0]!.interests).toEqual(["movies", "sneakers"]);
    expect(talent[1]!.interests.sort()).toEqual(["cards", "gaming", "sports"]);
  });

  test("no sign-up code: asks what they're here for, then name and email", async () => {
    let r = await text("hi");
    expect(r).toContain("Are you here to 1 book press");
    r = await text("1");
    expect(r).toContain("What's your name and email?");
    r = await text("Dre");
    expect(r).toBe("And your email?");
    r = await text("dre@example.com");
    expect(r).toContain("Welcome to Press Run, Dre. You're Member #0001");
  });

  test("an artist booking for themselves, with a handle that needs a platform", async () => {
    await text("hi");
    await text("1");
    await text("Sam sam@example.com");
    let r = await text("1");
    expect(r).toContain("What name do you go by on posts?");
    r = await text("Sam Lee @samlee");
    expect(r).toBe("Is @samlee on Instagram, TikTok, or somewhere else?");
    r = await text("tiktok");
    expect(r).toContain("What genre or niche?");
    r = await text("stand-up comedy");
    r = await text("6");
    expect(r).toContain("What are you into outside of comedy?");
    const p = await store.booker((await store.accountByPhone(PHONE))!.id);
    expect(p.handles[0]).toEqual({ handle: "@samlee", platform: "tiktok" });
  });
});

describe("rules that apply at every step", () => {
  test("STOP unsubscribes and START resumes the same question", async () => {
    await text("hi");
    expect(await text("STOP")).toContain("You're unsubscribed");
    expect(await text("hello?")).toBe("");
    const r = await text("START");
    expect(r).toContain("Welcome back");
    expect(r).toContain("Are you here to 1 book press");
  });

  test("a question mid-flow gets an answer, then the same question again", async () => {
    await text("hi");
    const r = await text("how much does this cost?");
    expect(r).toContain("Free while we're in beta.");
    expect(r).toContain("Back to where we were:");
    expect(r).toContain("Are you here to 1 book press");
  });

  test("voice notes, HELP, human", async () => {
    await text("hi");
    expect(await text("", PHONE, { media: [{ kind: "audio", url: "x.m4a" }] })).toBe("I can't listen to voice notes yet. Mind typing that?");
    expect(await text("help")).toContain('Text "menu" to see what I can do');
    expect(await text("human")).toContain("Courtney from Press Run will text you");
    expect(await text("anything")).toBe(""); // paused until Courtney hands it back
  });

  test("an unclear answer gets one retry, then is saved for review and the flow moves on", async () => {
    await text("hi");
    expect(await text("hmm")).toContain('Just reply 1 if you\'re booking press');
    expect(await text("still hmm")).toContain("What's your name and email?");
    const a = (await store.accountByPhone(PHONE))!;
    expect(a.needsReview[0]).toMatchObject({ step: "booker:B0", text: "still hmm" });
  });

  test("back re-asks the previous question; skip only works on optional ones", async () => {
    const code = await store.createSignupCode({ name: "Courtney", intent: "booker" });
    await text(`Sign me up ${code.code}`);
    expect(await text("skip")).toContain("I need this one");
    await text("1");
    expect(await text("back")).toContain("who are you booking for?");
  });

  test("24-hour and 72-hour nudges, then no more", async () => {
    await text("hi");
    clock = new Date(clock.getTime() + 25 * 36e5);
    expect((await engine.nudges())[0]!.out[0]).toEqual({ type: "text", text: "Still want to set up Press Run? Just answer the last question when you're ready." });
    clock = new Date(clock.getTime() + 48 * 36e5);
    expect((await engine.nudges())[0]!.out[0]).toEqual({ type: "text", text: "I'll stop nudging. Text me anytime and we'll pick up where we left off." });
    clock = new Date(clock.getTime() + 100 * 36e5);
    expect(await engine.nudges()).toHaveLength(0);
  });
});

describe("Press Stop onboarding (mockup chapter 2)", () => {
  test("Courtney lists Music for a Minute from the same thread", async () => {
    const code = await store.createSignupCode({ name: "Courtney", intent: "booker" });
    await text(`Sign me up ${code.code}`);
    for (const reply of ["1", "Courtney instagram.com/courtney", "music", "6", "skip", "skip", "skip", "Brooklyn", "no"]) await text(reply);

    let r = await text("list my show");
    expect(r).toContain("Love it. You're already Member #0001, so I'll skip the basics.");
    expect(r).toContain("What's your show called, and what's the format?");

    r = await text("I have 4 series lol. Music for a Minute is the main one, street interviews");
    expect(r).toContain("Let's do one at a time, starting with Music for a Minute.");
    expect(r).toContain("And you're the creator bookers will meet, Courtney?");

    r = await text("YES");
    expect(r).toContain("Where does Music for a Minute post");

    r = await text("IG @musicforaminute 48k\ntiktok.com/@musicforaminute 112k\nYouTube @musicforaminute 9k");
    expect(r).toContain("Which interests does Music for a Minute cover?");
    expect(r).toContain("19 🌎 General (anyone)");

    r = await text("general, mostly music");
    expect(r).toContain("Where do you film, and when?");

    r = await text("Washington Sq + SoHo, Thu–Sat afternoons. Open Nov 12, 13, 15");
    expect(r).toContain("What does a booker get from one appearance?");

    r = await text("60 sec street interview on IG + TikTok, raw clip after. Free for now");
    expect(r).toContain("Heads up: Press Run is free right now.");
    expect(r).toContain("How much notice do you need");

    r = await text("48 hours. Send requests to my booking line, 917-555-0199");
    expect(r).toContain("I'll text that number once to confirm.");
    expect(r).toContain("Instagram collab with @pressrun");

    r = await text("YES");
    expect(r).toContain("send 3 links to episodes");

    r = await text("instagram.com/reel/mfm-ep41\ntiktok.com/@musicforaminute/video/ep38\nyoutube.com/shorts/mfm-ep35");
    expect(r).toBe("Just confirming: you own these, or have permission to share them? Reply YES.");

    r = await text("YES");
    expect(r).toContain("For your card's cover");

    r = await text("use a frame");
    expect(r).toContain("Making your card and sample clip now 🎬");

    const a = (await store.accountByPhone(PHONE))!;
    expect(a.flow).toBeNull();
    const [s] = await store.stopsByOwner(a.id);
    expect(s).toMatchObject({
      status: "building", seriesName: "Music for a Minute", creatorNames: ["Courtney"], format: "street",
      audienceTotal: 169000, general: true, interests: ["music"], openDates: ["2026-11-12", "2026-11-13", "2026-11-15"],
      rateLow: 0, rateHigh: 0, rateText: "Free", noticeHours: 48, collab: "yes", rightsConfirmed: true, cover: "frame",
      bookingContact: { self: false, phone: "+19175550199" },
    });
    expect(s!.samples).toHaveLength(3);
    expect(s!.platforms.map(p => p.platform)).toEqual(["instagram", "tiktok", "youtube"]);
  });

  test("a new Press Stop from a website code gets the full welcome", async () => {
    const code = await store.createSignupCode({ name: "Tyler Walsh", intent: "stop" });
    const r = await text(`Hey Press Run 👋 List my show. Code ${code.code}`);
    expect(r).toContain("Welcome to Press Run, Tyler. You're Member #0001 🎟️");
    expect(r).toContain("Press Run takes NO service fees from your bookings for 12 months after they start. You always set your own rate.");
  });

  test("rate ranges, past dates and asking for what's missing", async () => {
    const code = await store.createSignupCode({ name: "Ana", intent: "stop" });
    await text(`List my show ${code.code}`);
    expect(await text("Corner Store Talks")).toBe("Great name. Which format is it? Reply 1–7.");
    expect(await text("3")).toContain("And you're the creator bookers will meet, Ana?");
    await text("yes");
    expect(await text("IG @cornerstore")).toBe("Roughly how many followers on Instagram? A ballpark is fine.");
    await text("12k");
    await text("4 and 13");
    expect(await text("Bushwick studio, Fridays")).toContain("And which dates are open in the next 4 weeks?");
    expect(await text("Oct 20, Nov 21")).toContain("Oct 20 has already passed, so I left it off.");
    expect(await text("call-in radio, 30 min segment")).toContain("And what's your rate for one appearance?");
    expect(await text("depends")).toContain('Give me a starting rate');
    const r = await text("from $250");
    expect(r).toContain("How much notice");
    const [s] = await store.stopsByOwner((await store.accountByPhone(PHONE))!.id);
    expect(s).toMatchObject({ seriesName: "Corner Store Talks", format: "radio", rateLow: 250, rateText: "from $250", openDates: ["2026-11-21"], interests: ["sports", "comedy"] });
  });
});
