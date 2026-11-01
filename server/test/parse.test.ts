import { describe, expect, test } from "bun:test";
import {
  classifyLink, extractSeriesName, isNyc, parseBudget, parseContact, parseDates, parseHandles, parseInterests,
  parseNoticeHours, parsePlatforms, parseRate, parseRoster, parseStopTypes,
} from "../src/engine/parse";

const NOW = new Date("2026-11-01T15:00:00Z");

describe("handles and profile links", () => {
  test("typed handles and pasted links, mixed", () => {
    expect(parseRoster("Nova Reign @novareign\nJay Mo tiktok.com/@jaymo.nyc")).toEqual([
      { name: "Nova Reign", handles: [{ handle: "@novareign" }] },
      { name: "Jay Mo", handles: [{ platform: "tiktok", handle: "@jaymo.nyc", url: "https://tiktok.com/@jaymo.nyc" }] },
    ]);
  });
  test("a link to a post is not a profile", () => {
    expect(classifyLink("instagram.com/reel/abc123")).toEqual({ post: "https://instagram.com/reel/abc123" });
    expect(classifyLink("https://www.youtube.com/@mfm")).toEqual({ handle: { platform: "youtube", handle: "@mfm", url: "https://youtube.com/@mfm" } });
  });
  test("platform named next to a handle", () => {
    expect(parseHandles("@samlee on TikTok").handles).toEqual([{ platform: "tiktok", handle: "@samlee" }]);
    expect(parseHandles("ig: novareign").handles).toEqual([{ platform: "instagram", handle: "@novareign" }]);
  });
});

describe("money", () => {
  test("budgets", () => {
    expect(parseBudget("3")).toMatchObject({ low: 1000, high: 5000 });
    expect(parseBudget("1-5k usually")).toMatchObject({ low: 1000, high: 5000, text: "$1k–$5k" });
    expect(parseBudget("around 3 grand")).toMatchObject({ low: 2400, high: 3600 });
    expect(parseBudget("depends lol")).toBeNull();
  });
  test("rates ignore durations", () => {
    expect(parseRate("60 sec street interview on IG + TikTok, raw clip after. Free for now")).toEqual({ low: 0, high: 0, text: "Free" });
    expect(parseRate("free for new artists, $500 for labels")).toEqual({ low: 0, high: 500, text: "Free–$500" });
    expect(parseRate("$300–500")).toEqual({ low: 300, high: 500, text: "$300–$500" });
  });
});

describe("Press Stop answers", () => {
  test("show names", () => {
    expect(extractSeriesName("I have 4 series lol. Music for a Minute is the main one, street interviews")).toBe("Music for a Minute");
    expect(extractSeriesName("What Do You Do For a Living, street")).toBe("What Do You Do For a Living");
  });
  test("platforms with follower counts", () => {
    expect(parsePlatforms("IG @musicforaminute 48k\ntiktok.com/@musicforaminute 112k\nYouTube 9k")).toEqual([
      { platform: "instagram", handle: "@musicforaminute", url: undefined, followers: 48000 },
      { platform: "tiktok", handle: "@musicforaminute", url: "https://tiktok.com/@musicforaminute", followers: 112000 },
      { platform: "youtube", handle: undefined, url: undefined, followers: 9000 },
    ]);
  });
  test("dates, notice and contact", () => {
    expect(parseDates("Open Nov 12, 13 & 15", NOW)).toEqual({ dates: ["2026-11-12", "2026-11-13", "2026-11-15"], past: [], flexible: false });
    expect(parseDates("whenever", NOW).flexible).toBe(true);
    expect(parseNoticeHours("a week")).toBe(168);
    expect(parseContact("my producer Dee 917-555-0123")).toEqual({ self: false, name: "Dee", phone: "+19175550123" });
    expect(parseContact("text me here")).toEqual({ self: true });
  });
  test("interests, types, NYC", () => {
    expect(parseInterests("🎮 🏀 and he collects sports cards", false).ids.sort()).toEqual(["cards", "gaming", "sports"]);
    expect(parseInterests("general, mostly music", true).ids.sort()).toEqual(["general", "music"]);
    expect(parseStopTypes("street stuff and pods")).toEqual(["street", "podcast"]);
    expect(isNyc("Brooklyn")).toBe(true);
    expect(isNyc("Atlanta")).toBe(false);
  });
});
