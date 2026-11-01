// Turns free-text replies into structured answers. Rule-based on purpose:
// every rule here maps to an "Accept:" line in the onboarding scripts.
// Anything these rules can't read goes through the script's "if unclear" path.

import type { Handle, PlatformEntry } from "../types";

export const norm = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");

const words = (s: string) => norm(s).replace(/[^a-z0-9@#$.\- ]/g, " ").split(" ").filter(Boolean);

export function isYes(s: string): boolean {
  return /^(y|yes|yeah|yea|yep|yup|ya|sure|ok|okay|k|correct|right|definitely|of course|for sure|👍|❤️|❤|💯|🔥|that'?s me|me|i am|i do)\b|^(👍|❤️|❤|💯|🔥)$/u.test(norm(s));
}

export function isNo(s: string): boolean {
  return /^(n|no|nope|nah|not yet|not really|no thanks|never|none)\b/.test(norm(s));
}

/** Distinct integers 1..max in the order they appear ("1 and 3", "1,3", "2 & 6"). */
export function numbersIn(s: string, max: number): number[] {
  const out: number[] = [];
  for (const m of norm(s).matchAll(/(?<![\d$.,])\b(\d{1,2})\b(?![\d.,]*\s*(k|%|\$|am|pm|followers))/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= max && !out.includes(n)) out.push(n);
  }
  return out;
}

export function extractEmail(s: string): string | undefined {
  return s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

export function extractName(s: string): string | undefined {
  let t = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
  t = t.replace(/\b(hi|hey|hello|yo)\b[,!]*/gi, " ");
  t = t.replace(/\b(i'?m|i am|my name is|name is|name:|it'?s|this is|call me|email:?|and|my email is|email is)\b/gi, " ");
  t = t.replace(/[,.;:!]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  const parts = t.split(" ").slice(0, 4);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// ---------- Handles and profile links (booker script, section 0) ----------

const PLATFORM_WORDS: Record<string, string> = {
  ig: "instagram", insta: "instagram", instagram: "instagram",
  tiktok: "tiktok", tt: "tiktok", "tik tok": "tiktok",
  youtube: "youtube", yt: "youtube",
  x: "x", twitter: "x",
  twitch: "twitch", kick: "kick", facebook: "facebook", fb: "facebook",
  snapchat: "snapchat", snap: "snapchat", soundcloud: "soundcloud", spotify: "spotify",
};

export interface HandleParse {
  handles: Handle[];
  /** Links to a single post or video instead of a profile. */
  posts: string[];
  /** @handles with no platform named. */
  platformless: string[];
}

const URL_RE = /\b((?:https?:\/\/)?(?:www\.|m\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;]*)?)/gi;

export function classifyLink(raw: string): { handle?: Handle; post?: string } {
  const url = raw.replace(/[).,!?]+$/, "");
  const u = url.replace(/^https?:\/\//i, "").replace(/^(www|m)\./i, "");
  const [host = "", ...segs] = u.split("/").filter(Boolean);
  const h = host.toLowerCase();
  const full = "https://" + u;
  const seg0 = segs[0] ?? "";
  if (h === "instagram.com") {
    if (["p", "reel", "reels", "stories", "tv"].includes(seg0)) return { post: full };
    return seg0 ? { handle: { platform: "instagram", handle: "@" + seg0, url: full } } : {};
  }
  if (h === "tiktok.com") {
    if (segs.includes("video")) return { post: full };
    return seg0.startsWith("@") ? { handle: { platform: "tiktok", handle: seg0, url: full } } : {};
  }
  if (h === "youtube.com" || h === "youtu.be") {
    if (h === "youtu.be" || ["watch", "shorts", "live"].includes(seg0) || seg0.startsWith("watch")) return { post: full };
    if (seg0.startsWith("@")) return { handle: { platform: "youtube", handle: seg0, url: full } };
    if (["c", "channel", "user"].includes(seg0) && segs[1]) return { handle: { platform: "youtube", handle: segs[1], url: full } };
    return {};
  }
  if (h === "x.com" || h === "twitter.com") {
    if (segs.includes("status")) return { post: full };
    return seg0 ? { handle: { platform: "x", handle: "@" + seg0, url: full } } : {};
  }
  if (h === "twitch.tv") return seg0 ? { handle: { platform: "twitch", handle: seg0, url: full } } : {};
  if (h === "soundcloud.com") {
    if (segs.length >= 2) return { post: full };
    return seg0 ? { handle: { platform: "soundcloud", handle: seg0, url: full } } : {};
  }
  if (h === "open.spotify.com" && seg0 === "artist") return { handle: { platform: "spotify", url: full } };
  if (h === "music.apple.com" && segs.includes("artist")) return { handle: { platform: "apple_music", url: full } };
  if (h === "linktr.ee") return seg0 ? { handle: { platform: "linktree", handle: seg0, url: full } } : {};
  return { handle: { platform: "website", url: full } };
}

function platformNear(text: string, index: number, length: number): string | undefined {
  const around = norm(text.slice(Math.max(0, index - 14), index + length + 16));
  for (const [word, platform] of Object.entries(PLATFORM_WORDS)) {
    if (new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(around)) return platform;
  }
  return undefined;
}

export function parseHandles(text: string): HandleParse {
  const handles: Handle[] = [];
  const posts: string[] = [];
  const platformless: string[] = [];
  const urlSpans: [number, number][] = [];
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[1]!;
    if (/@/.test(raw.split("/")[0] ?? "") || !/[a-z]{2,}\.[a-z]{2,}|\//i.test(raw)) continue; // emails, "e.g."
    if (!/\.(com|tv|be|ee|app|co|io|net|org|me|fm|link|ly)\b/i.test(raw)) continue;
    urlSpans.push([m.index!, m.index! + raw.length]);
    const c = classifyLink(raw);
    if (c.post) posts.push(c.post);
    if (c.handle) handles.push(c.handle);
  }
  for (const m of text.matchAll(/(^|[\s(,])@([a-z0-9._]{2,30})/gi)) {
    const at = m.index! + m[1]!.length;
    if (urlSpans.some(([a, b]) => at >= a && at < b)) continue;
    const handle = "@" + m[2]!.replace(/\.$/, "");
    const platform = platformNear(text, at, handle.length);
    if (platform) handles.push({ platform, handle });
    else { handles.push({ handle }); platformless.push(handle); }
  }
  for (const m of text.matchAll(/\b(ig|insta|instagram|tiktok|tt|yt|youtube|twitter|x)\s*[:=]\s*([a-z0-9._]{2,30})\b/gi)) {
    const handle = "@" + m[2]!;
    if (handles.some(h => h.handle?.toLowerCase() === handle.toLowerCase())) continue;
    handles.push({ platform: PLATFORM_WORDS[m[1]!.toLowerCase()], handle });
  }
  return { handles, posts, platformless };
}

/** Removes links, @handles and platform words, leaving the name part. */
function stripHandles(s: string): string {
  return s
    .replace(URL_RE, " ")
    .replace(/@[a-z0-9._]+/gi, " ")
    .replace(/\b(ig|insta|instagram|tiktok|tt|yt|youtube|twitter|on|is|handle|link|profile|main)\b\s*:?/gi, " ")
    .replace(/[,;:()\-–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RosterEntry { name?: string; handles: Handle[]; nicheText?: string }

/** "Nova Reign @novareign\nJay Mo tiktok.com/@jaymo.nyc", one artist per line (or comma). */
export function parseRoster(text: string): RosterEntry[] {
  let lines = text.split(/\n|;/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 1) {
    const commaParts = lines[0]!.split(",").map(p => p.trim()).filter(Boolean);
    if (commaParts.length > 1) lines = commaParts;
  }
  return lines.map(line => {
    const { handles } = parseHandles(line);
    const name = stripHandles(line);
    return { name: name || undefined, handles };
  }).filter(e => e.name || e.handles.length);
}

// ---------- Choices ----------

export function parseRole(s: string): { primary: "self" | "manager" | "label" | "brand"; extra: string[] } | null {
  const order: ("self" | "manager" | "label" | "brand")[] = [];
  for (const n of numbersIn(s, 4)) order.push((["self", "manager", "label", "brand"] as const)[n - 1]!);
  const t = norm(s);
  const kw: [RegExp, "self" | "manager" | "label" | "brand"][] = [
    [/\b(me|myself|i'?m the (artist|actor|creator)|artist|actor|creator|comedian|rapper|singer)\b/, "self"],
    [/\b(manager|manage|my artists|clients|talent)\b/, "manager"],
    [/\b(label|agency|publicist|pr|firm)\b/, "label"],
    [/\b(brand|company|product)\b/, "brand"],
  ];
  for (const [re, role] of kw) if (re.test(t) && !order.includes(role)) order.push(role);
  if (!order.length) return null;
  return { primary: order[0]!, extra: order.slice(1) };
}

export const STOP_TYPES = ["street", "creator_features", "podcast", "radio", "livestream", "open"] as const;
export const STOP_TYPE_LABELS: Record<string, string> = {
  street: "street interviews", creator_features: "creator features and collabs", podcast: "podcasts",
  radio: "radio", livestream: "livestreams", open: "open to anything",
};

export function parseStopTypes(s: string): string[] {
  const out = new Set<string>(numbersIn(s, 6).map(n => STOP_TYPES[n - 1]!));
  const t = norm(s);
  if (/\bstreet\b/.test(t)) out.add("street");
  if (/\b(youtube shows?|series|collabs?|shoots?|features?|content creators?)\b/.test(t)) out.add("creator_features");
  if (/\b(pods?|podcasts?)\b/.test(t)) out.add("podcast");
  if (/\bradio\b/.test(t)) out.add("radio");
  if (/\b(live|livestreams?|ig live|twitch|kick)\b/.test(t)) out.add("livestream");
  if (/\b(all|anything|whatever|any|everything)\b/.test(t)) out.add("open");
  return [...out];
}

export const INTERESTS = [
  { id: "music", emoji: "🎵", label: "Music", kw: ["music"] },
  { id: "movies", emoji: "🎬", label: "Movies & TV", kw: ["movie", "movies", "film", "films", "tv", "cinema"] },
  { id: "gaming", emoji: "🎮", label: "Gaming", kw: ["gaming", "games", "video games", "gamer"] },
  { id: "sports", emoji: "🏀", label: "Sports", kw: ["sports", "basketball", "football", "soccer", "nba", "nfl"] },
  { id: "cards", emoji: "🃏", label: "Trading cards", kw: ["cards", "pokemon", "pokémon", "sports cards", "trading cards"] },
  { id: "sneakers", emoji: "👟", label: "Sneakers & fashion", kw: ["sneakers", "fashion", "kicks", "style", "streetwear"] },
  { id: "beauty", emoji: "💄", label: "Beauty", kw: ["beauty", "makeup", "skincare"] },
  { id: "food", emoji: "🍜", label: "Food", kw: ["food", "cooking", "chef", "restaurants"] },
  { id: "fitness", emoji: "💪", label: "Fitness", kw: ["fitness", "gym", "workout", "wellness"] },
  { id: "anime", emoji: "🎌", label: "Anime & comics", kw: ["anime", "manga", "comics"] },
  { id: "tech", emoji: "💻", label: "Tech", kw: ["tech", "technology", "coding", "gadgets"] },
  { id: "money", emoji: "💰", label: "Money & business", kw: ["money", "business", "investing", "finance", "entrepreneur"] },
  { id: "comedy", emoji: "😂", label: "Comedy", kw: ["comedy", "funny", "standup", "stand-up"] },
  { id: "motivation", emoji: "🧠", label: "Motivation & mindset", kw: ["motivation", "mindset", "self-improvement", "self improvement"] },
  { id: "travel", emoji: "✈️", label: "Travel", kw: ["travel", "traveling"] },
  { id: "art", emoji: "🎨", label: "Art & design", kw: ["art", "design", "painting", "drawing"] },
  { id: "cars", emoji: "🚗", label: "Cars", kw: ["cars", "car", "automotive"] },
  { id: "photography", emoji: "📸", label: "Photography", kw: ["photography", "photos", "camera"] },
] as const;

export const interestList = (withGeneral: boolean) =>
  INTERESTS.map((it, i) => `${i + 1} ${it.emoji} ${it.label}`).join("\n") + (withGeneral ? `\n${INTERESTS.length + 1} 🌎 General (anyone)` : "");

export const interestEmojis = (ids: string[]) =>
  ids.map(id => id === "general" ? "🌎" : INTERESTS.find(i => i.id === id)?.emoji ?? "").filter(Boolean).join(" ");

export function parseInterests(s: string, allowGeneral: boolean): { ids: string[]; unknown: string[] } {
  const ids = new Set<string>();
  const max = INTERESTS.length + (allowGeneral ? 1 : 0);
  for (const n of numbersIn(s, max)) ids.add(n <= INTERESTS.length ? INTERESTS[n - 1]!.id : "general");
  const t = norm(s);
  for (const it of INTERESTS) {
    if (s.includes(it.emoji) || it.kw.some(k => new RegExp(`\\b${k}\\b`).test(t))) ids.add(it.id);
  }
  if (allowGeneral && (/\b(general|anyone|everyone|all)\b/.test(t) || s.includes("🌎"))) ids.add("general");
  const unknown = ids.size === 0 && t && !/^(skip|none|nothing|idk|n\/a)$/.test(t) ? [s.trim()] : [];
  return { ids: [...ids], unknown };
}

// ---------- Money ----------

function amount(numStr: string, suffix?: string): number {
  const n = Number(numStr.replace(/,/g, ""));
  return /k|grand|thousand/i.test(suffix ?? "") ? n * 1000 : n;
}

/** All money amounts in a string, with "1-5k" read as 1k–5k. */
function amounts(s: string): number[] {
  const out: { n: number; k: boolean }[] = [];
  for (const m of norm(s).matchAll(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|grand|thousand)?/g)) {
    out.push({ n: amount(m[1]!, m[2]), k: !!m[2] });
  }
  if (out.length === 2 && !out[0]!.k && out[1]!.k && out[0]!.n < 100) out[0]!.n *= 1000;
  return out.map(o => o.n);
}

export type Budget = { low?: number; high?: number; text: string; depends?: boolean };

export function parseBudget(s: string): Budget | null {
  const t = norm(s);
  const opt = t.match(/^(?:option\s*)?([1-5])\.?$/);
  if (opt) {
    return ([
      { low: 0, high: 0, text: "free Press Stops only" },
      { low: 0, high: 1000, text: "under $1k" },
      { low: 1000, high: 5000, text: "$1k–$5k" },
      { low: 5000, text: "$5k+" },
      { text: "depends on the run", depends: true },
    ] as Budget[])[Number(opt[1]) - 1]!;
  }
  if (/\b(free|nothing|\$0|zero)\b/.test(t)) return { low: 0, high: 0, text: "free Press Stops only" };
  if (/\bdepends\b/.test(t) && !/\d/.test(t)) return null;
  const a = amounts(t);
  if (a.length >= 2) return { low: Math.min(a[0]!, a[1]!), high: Math.max(a[0]!, a[1]!), text: `$${fmtK(Math.min(a[0]!, a[1]!))}–$${fmtK(Math.max(a[0]!, a[1]!))}` };
  if (a.length === 1) {
    const n = a[0]!;
    if (/\b(under|less than|below|max|up to)\b/.test(t)) return { low: 0, high: n, text: `under $${fmtK(n)}` };
    return { low: Math.round(n * 0.8), high: Math.round(n * 1.2), text: `around $${fmtK(n)}` };
  }
  return null;
}

export const fmtK = (n: number) => n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);

export type Rate = { low?: number; high?: number; text: string; depends?: boolean };

/** A Press Stop's rate: "free", "$300", "$300–500", "free–$500", "from $250". */
export function parseRate(s: string): Rate | null {
  // Durations and counts aren't money: "60 sec", "1 minute", "2 posts", "10k followers".
  const t = norm(s).replace(/\d+\s*-?\s*(secs?|seconds?|s\b|mins?|minutes?|hrs?|hours?|days?|weeks?|x\b|%|posts?|clips?|videos?|episodes?|k?\s*followers?|views?)/g, " ");
  const free = /\bfree\b/.test(t);
  const a = amounts(t);
  if (/\bdepends\b/.test(t) && !a.length) return { text: "depends", depends: true };
  if (free && a.length) return { low: 0, high: Math.max(...a), text: `Free–$${Math.max(...a)}` };
  if (free) return { low: 0, high: 0, text: "Free" };
  if (a.length >= 2) return { low: Math.min(a[0]!, a[1]!), high: Math.max(a[0]!, a[1]!), text: `$${Math.min(a[0]!, a[1]!)}–$${Math.max(a[0]!, a[1]!)}` };
  if (a.length === 1) return /\b(from|starting|starts|min)\b/.test(t) ? { low: a[0]!, text: `from $${a[0]}` } : { low: a[0]!, high: a[0]!, text: `$${a[0]}` };
  return null;
}

// ---------- Hard no's, places ----------

const HARD_NO_TAGS: [RegExp, string][] = [
  [/explicit|nsfw|cursing/, "explicit"],
  [/prank/, "prank"],
  [/politic/, "political"],
  [/alcohol|liquor|drinks?/, "alcohol"],
  [/cannabis|weed|420/, "cannabis"],
  [/call-?ins?/, "live call-ins"],
  [/morning|before (9|10|11|noon)|early/, "mornings"],
];

export function parseHardNos(s: string): { tags: string[]; none: boolean } {
  const t = norm(s);
  if (/^(none|no|nah|nope|nothing|n\/a|all good|i'?m good)\b/.test(t) && t.split(" ").length <= 3) return { tags: [], none: true };
  return { tags: HARD_NO_TAGS.filter(([re]) => re.test(t)).map(([, tag]) => tag), none: false };
}

const NYC_RE = /\b(nyc|new york|ny|manhattan|brooklyn|bk|queens|bronx|the bronx|staten island|harlem|soho|williamsburg|bushwick|astoria|lower east side|les|uptown|downtown)\b|\b(10\d{3}|11[2-6]\d{2})\b/;

export function isNyc(s: string): boolean {
  return NYC_RE.test(norm(s));
}

// ---------- Press Stop answers ----------

export const FORMATS = ["street", "podcast", "radio", "livestream", "youtube", "shoot", "other"] as const;
export const FORMAT_LABELS: Record<string, string> = {
  street: "Street interview", podcast: "Podcast", radio: "Radio", livestream: "Livestream",
  youtube: "YouTube show", shoot: "Photo or video shoot", other: "Other",
};

export function parseFormats(s: string): string[] {
  const out = new Set<string>(numbersIn(s.replace(/\b\d+\s+(series|shows?)\b/gi, " "), 7).map(n => FORMATS[n - 1]!));
  const t = norm(s);
  if (/\bstreet\b/.test(t)) out.add("street");
  if (/\b(pod|podcast)\b/.test(t)) out.add("podcast");
  if (/\bradio\b/.test(t)) out.add("radio");
  if (/\b(livestream|ig live|twitch|kick|live stream)\b/.test(t)) out.add("livestream");
  if (/\b(youtube show|youtube series|yt show)\b/.test(t)) out.add("youtube");
  if (/\b(shoot|photo|photographer|video shoot)\b/.test(t)) out.add("shoot");
  return [...out];
}

const SMALL = "for|a|an|the|of|your|you|and|to|in|on|do|with|at|my";

/** Pulls a show name out of a reply: quoted text, a Title Case phrase, or a short reply as-is. */
export function extractSeriesName(s: string): string | undefined {
  const quoted = s.match(/["“]([^"”]{2,60})["”]/);
  if (quoted) return quoted[1]!.trim();
  const re = new RegExp(`\\b([A-Z][\\w'’]*(?:\\s+(?:(?:${SMALL})\\s+)*[A-Z][\\w'’]*)+)`, "g");
  const candidates = [...s.matchAll(re)].map(m => m[1]!).filter(c => !/^(I|I'm|Im|My|It|The Main)$/.test(c));
  if (candidates.length) return candidates.sort((a, b) => b.length - a.length)[0];
  const stripped = s.replace(/\b[1-7]\b/g, " ").replace(/\b(it'?s|called|my show is|the show is|a|street interviews?|podcast|radio|livestream|youtube show|shoot)\b/gi, " ").replace(/[,.;:]+/g, " ").replace(/\s+/g, " ").trim();
  if (stripped && stripped.split(" ").length <= 6) return stripped.replace(/\b\w/g, c => c.toUpperCase());
  return undefined;
}

export function parseCount(s: string): number | undefined {
  const m = norm(s).match(/(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/);
  if (!m) return undefined;
  const n = Number(m[1]!.replace(/,/g, ""));
  return m[2] === "k" ? Math.round(n * 1000) : m[2] === "m" ? Math.round(n * 1_000_000) : n;
}

/** "IG @musicforaminute 48k\ntiktok.com/@musicforaminute 112k\nYouTube 9k" */
export function parsePlatforms(s: string): PlatformEntry[] {
  const parts = s.split(/\n|;|,(?![\d]{3})/).map(p => p.trim()).filter(Boolean);
  const out: PlatformEntry[] = [];
  for (const part of parts) {
    const { handles } = parseHandles(part);
    const h = handles.find(x => x.platform && x.platform !== "website") ?? handles[0];
    let platform = h?.platform;
    if (!platform || platform === "website") {
      const t = norm(part);
      for (const [word, p] of Object.entries(PLATFORM_WORDS)) {
        if (new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(t)) { platform = p; break; }
      }
    }
    const withoutLinks = part.replace(URL_RE, " ").replace(/@[a-z0-9._]+/gi, " ");
    const followers = parseCount(withoutLinks);
    if (!platform && followers === undefined && !h) continue;
    out.push({ platform, handle: h?.handle, url: h?.url, followers });
  }
  return out;
}

export const roundAudience = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Nov 12, 13, 15" → ISO dates; drops dates already past. */
export function parseDates(s: string, now: Date): { dates: string[]; past: string[]; flexible: boolean } {
  const t = norm(s);
  const flexible = /\b(flexible|whenever|anytime|any time|open|wide open)\b/.test(t) && !/\d/.test(t);
  const dates: string[] = [];
  const past: string[] = [];
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+((?:\d{1,2}(?:st|nd|rd|th)?(?:\s*(?:,|&|and|-|–)\s*)?)+)/g;
  for (const m of t.matchAll(re)) {
    const month = MONTHS.indexOf(m[1]!.slice(0, 3));
    for (const d of m[2]!.matchAll(/\d{1,2}/g)) {
      let year = now.getFullYear();
      const day = Number(d[0]);
      let date = new Date(Date.UTC(year, month, day));
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      // Months far behind today roll into next year ("Jan 5" said in November).
      if (date.getTime() < today && now.getMonth() - month > 6) { year += 1; date = new Date(Date.UTC(year, month, day)); }
      const iso = date.toISOString().slice(0, 10);
      if (date.getTime() < today) past.push(iso); else if (!dates.includes(iso)) dates.push(iso);
    }
  }
  return { dates, past, flexible };
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00Z");
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCDate()}`;
};

export function parseNoticeHours(s: string): number | undefined {
  const t = norm(s);
  if (/same[- ]day|no notice|anytime/.test(t)) return 0;
  const m = t.match(/(\d+|a|an|one|two|three)\s*(hours?|hrs?|h|days?|d|weeks?|wks?|w)\b/);
  if (!m) return undefined;
  const n = ({ a: 1, an: 1, one: 1, two: 2, three: 3 } as Record<string, number>)[m[1]!] ?? Number(m[1]);
  const unit = m[2]![0];
  return unit === "h" ? n : unit === "d" ? n * 24 : n * 24 * 7;
}

export function parsePhone(s: string): string | undefined {
  const m = s.match(/(\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);
  return m ? `+1${m[2]}${m[3]}${m[4]}` : undefined;
}

export function parseContact(s: string): { self: true } | { self: false; name?: string; phone: string } | null {
  const t = norm(s);
  const phone = parsePhone(s);
  if (phone) {
    const name = s.match(/\b(?:producer|manager|assistant|partner|teammate|editor|co-?host)\s+([A-Z][a-z]+)/)?.[1];
    return { self: false, name, phone };
  }
  if (/\b(me|here|this number|this one|text me|mine|myself)\b/.test(t)) return { self: true };
  return null;
}

export function parseCollab(s: string): "yes" | "no" | "ask" {
  const t = norm(s);
  if (/\b(ask|depends|sometimes|maybe|each time|case by case)\b/.test(t)) return "ask";
  if (isYes(s)) return "yes";
  if (isNo(s)) return "no";
  return "ask";
}

export const isSkip = (s: string) => /^(skip|pass|next|idk|i don'?t know|not sure|n\/a)$/.test(norm(s));
