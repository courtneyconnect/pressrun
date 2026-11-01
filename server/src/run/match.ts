// From "NYC Nov 12–15, 2 artists, $5k budget" to ranked Press Stops.
// Matching is plain rules on purpose (build plan, section 5), so Courtney can
// always see why a Press Stop came up.

import type { BookerProfile, PressStop, RunRequest, Talent } from "../types";
import {
  INTERESTS, dayName, fmtDate, fmtK, isNyc, norm, parseDates, parseRelativeWindow, STOP_TYPE_LABELS, weekdaysIn,
} from "../engine/parse";

const OTHER_CITY = /\b(la|los angeles|atlanta|atl|chicago|miami|houston|london|toronto|philly|philadelphia|dc|washington dc|nashville|austin|dallas|san francisco|sf|bay area|vegas|las vegas|boston|detroit|new orleans|seattle)\b/i;

export interface ParsedRequest {
  start?: string;
  end?: string;
  past: string[];
  city?: string;
  nyc?: boolean;
  talentIds?: string[];
  needWho: boolean;
  budgetMax?: number;
  types: string[];
}

/** Press Stop types named in plain words (no numbers: "2 artists" isn't option 2). */
export function stopTypeWords(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/\bstreet\b/.test(t)) out.push("street");
  if (/\b(pods?|podcasts?)\b/.test(t)) out.push("podcast");
  if (/\bradio\b/.test(t)) out.push("radio");
  if (/\b(livestreams?|ig live|twitch)\b/.test(t)) out.push("livestream");
  if (/\b(youtube shows?|collabs?|creator features?|shoots?)\b/.test(t)) out.push("creator_features");
  return out;
}

/** "$5k", "5k", "$5,000", "3 grand": the first money amount, ignoring dates and counts. */
export function moneyIn(text: string): number | undefined {
  const m = norm(text).match(/\$\s*\d[\d,]*(?:\.\d+)?\s*(?:k|grand)?|\b\d[\d,]*(?:\.\d+)?\s*(?:k|grand)\b/);
  if (!m) return undefined;
  const n = Number(m[0].replace(/[$,\s]|k|grand/g, ""));
  return /k|grand/.test(m[0]) ? Math.round(n * 1000) : n;
}

export function parseRequest(text: string, now: Date, profile: BookerProfile, talent: Talent[]): ParsedRequest {
  const out: ParsedRequest = { past: [], needWho: false, types: stopTypeWords(text) };
  const d = parseDates(text, now);
  out.past = d.past;
  if (d.dates.length) { out.start = d.dates[0]; out.end = d.dates[d.dates.length - 1]; }
  else {
    const rel = parseRelativeWindow(text, now);
    if (rel) { out.start = rel.start; out.end = rel.end; }
  }
  const other = text.match(OTHER_CITY)?.[0];
  if (isNyc(text)) { out.nyc = true; out.city = "New York"; }
  else if (other) { out.nyc = false; out.city = other.length <= 3 ? other.toUpperCase() : other.replace(/\b\w/g, c => c.toUpperCase()); }

  if (profile.role === "self") out.talentIds = talent.slice(0, 1).map(t => t.id);
  else if (profile.role === "brand" || talent.length <= 1) out.talentIds = talent.map(t => t.id);
  else {
    const t = norm(text);
    const named = talent.filter(tl => t.includes(norm(tl.name)) || t.includes(norm(tl.name.split(" ")[0]!)));
    const count = t.match(/\b(\d+)\s+(artists|people|acts)\b/)?.[1];
    if (named.length) out.talentIds = named.map(tl => tl.id);
    else if (/\b(all|both|everyone|the whole roster)\b/.test(t) || (count && Number(count) >= talent.length)) out.talentIds = talent.map(tl => tl.id);
    else out.needWho = true;
  }
  out.budgetMax = moneyIn(text);
  return out;
}

/** "NYC, Wed Nov 12 – Sat Nov 15, for Nova Reign and Jay Mo, up to $5k" */
export function describeRequest(r: RunRequest, talent: Talent[]): string {
  const when = r.start && r.end && r.start !== r.end
    ? `${dayName(r.start)} ${fmtDate(r.start)} – ${dayName(r.end)} ${fmtDate(r.end)}`
    : r.start ? `${dayName(r.start)} ${fmtDate(r.start)}` : "";
  const who = talent.filter(t => r.talentIds.includes(t.id)).map(t => t.name);
  return [
    r.city === "New York" ? "NYC" : r.city ?? "NYC",
    when,
    who.length ? `for ${andList(who)}` : "",
    r.budgetMax !== undefined ? (r.budgetMax === 0 ? "free Press Stops only" : `up to $${fmtK(r.budgetMax)}`) : "",
  ].filter(Boolean).join(", ");
}

export const andList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// ---------- matching ----------

export const typeOfStop = (s: PressStop) =>
  s.format === "street" || s.format === "podcast" || s.format === "radio" || s.format === "livestream" ? s.format : "creator_features";

const HARD_NO_TESTS: Record<string, RegExp> = {
  explicit: /explicit|nsfw|uncensored/, prank: /prank/, political: /politic/, alcohol: /alcohol|bar crawl|liquor|drinks/,
  cannabis: /cannabis|weed|420/, "live call-ins": /call-?in/, mornings: /morning|breakfast|\b\d{1,2}\s*am\b/,
};

function windowDays(r: RunRequest): string[] {
  if (!r.start) return [];
  const out: string[] = [];
  for (let d = new Date(r.start + "T12:00:00Z"); out.length < 62; d = new Date(d.getTime() + 864e5)) {
    const k = d.toISOString().slice(0, 10);
    if (r.end && k > r.end) break;
    out.push(k);
    if (!r.end) break;
  }
  return out;
}

/** The dates in the request window this Press Stop could film, respecting their notice. */
export function candidateDates(s: PressStop, r: RunRequest, now: Date): string[] {
  const days = windowDays(r);
  const openWeekdays = weekdaysIn(s.openText ?? "");
  let dates = s.flexible ? days
    : s.openDates.length ? s.openDates.filter(d => days.includes(d))
      : openWeekdays.length ? days.filter(d => openWeekdays.includes(new Date(d + "T12:00:00Z").getUTCDay())) : [];
  if (r.only.weekdays?.length) dates = dates.filter(d => r.only.weekdays!.includes(new Date(d + "T12:00:00Z").getUTCDay()));
  const notice = s.noticeHours ?? 0;
  return dates.filter(d => (Date.parse(d + "T17:00:00Z") - now.getTime()) / 36e5 >= notice);
}

export interface Match { stop: PressStop; score: number; why?: string; dates: string[] }

export function matchStops(stops: PressStop[], r: RunRequest, profile: BookerProfile, talent: Talent[], now: Date): Match[] {
  const forTalent = talent.filter(t => r.talentIds.includes(t.id));
  const wanted = profile.stopTypes.filter(t => t !== "open");
  const out: Match[] = [];
  for (const s of stops) {
    if (s.status !== "live") continue;
    if (r.city === "New York" && s.outsideNyc && !s.remoteOk) continue;
    const dates = candidateDates(s, r, now);
    if (r.start && !dates.length) continue;
    const rateLow = s.rateLow ?? 0;
    if (r.budgetMax !== undefined && rateLow > r.budgetMax) continue;
    if (r.only.maxRate !== undefined && rateLow > r.only.maxRate) continue;
    if (r.only.types?.length && !r.only.types.includes(typeOfStop(s))) continue;
    const text = norm(`${s.seriesName} ${s.deliverableText ?? ""} ${s.placesText ?? ""}`);
    if (profile.hardNos.some(tag => HARD_NO_TESTS[tag]?.test(text))) continue;

    let score = 0;
    if (wanted.includes(typeOfStop(s))) score += 3;
    const whys: string[] = [];
    const people = forTalent.length ? forTalent.map(t => ({ name: t.name.split(" ")[0]!, interests: t.interests })) : [{ name: "you", interests: profile.interests }];
    for (const p of people) {
      const shared = p.interests.filter(i => s.interests.includes(i));
      score += 4 * Math.min(2, shared.length);
      if (shared.length) {
        const it = INTERESTS.find(x => x.id === shared[0]);
        whys.push(`${p.name} (${it?.emoji} ${it?.label.toLowerCase()})`);
      }
    }
    if (s.general) score += 1;
    score += Math.min(3, dates.length);
    score += Math.min(3, Math.log10((s.audienceTotal ?? 0) + 1) / 2);
    if (profile.fewerFormats?.includes(s.format ?? "")) score -= 3;
    out.push({ stop: s, score, why: whys.length ? andList(whys) : undefined, dates });
  }
  return out.sort((a, b) => b.score - a.score || (b.stop.audienceTotal ?? 0) - (a.stop.audienceTotal ?? 0));
}

export const typeLabel = (t: string) => STOP_TYPE_LABELS[t] ?? t;
