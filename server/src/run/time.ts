// Shoot times. People text New York times ("2:30pm"); reminders need UTC.

import { dayName, fmtDate, norm, parseDates, weekdaysIn } from "../engine/parse";

const NY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

/** "2026-11-13" + "14:30" in New York → the UTC instant. */
export function nyToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = Object.fromEntries(NY.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
  return new Date(guess - (wall - guess));
}

/** "2:30 pm", "2pm", "14:30", "noon" → "14:30". */
export function parseTime(text: string): string | undefined {
  const t = norm(text);
  if (/\bnoon\b/.test(t)) return "12:00";
  const m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/) ?? t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3]?.startsWith("p") && h < 12) h += 12;
  if (m[3]?.startsWith("a") && h === 12) h = 0;
  return h <= 23 && min <= 59 ? `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` : undefined;
}

/** "14:30" → "2:30pm" */
export function fmtTime(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** "Thu Nov 13, 2:30pm" */
export const fmtWhen = (date: string, time?: string) => `${dayName(date)} ${fmtDate(date)}${time ? `, ${fmtTime(time)}` : ""}`;

/** A date in the request window from "Thu Nov 13", "Nov 13" or "Thursday". */
export function dateInWindow(text: string, now: Date, start?: string, end?: string): string | undefined {
  const d = parseDates(text, now).dates;
  if (d.length) return d.find(x => (!start || x >= start) && (!end || x <= end)) ?? d[0];
  const wd = weekdaysIn(text)[0];
  if (wd === undefined || !start) return undefined;
  for (let x = new Date(start + "T12:00:00Z"); x.toISOString().slice(0, 10) <= (end ?? start); x = new Date(x.getTime() + 864e5)) {
    if (x.getUTCDay() === wd) return x.toISOString().slice(0, 10);
  }
  return undefined;
}

/** The place from "YES Thu Nov 13, 2:30pm, Washington Sq Park. Can she…?" → "Washington Sq Park". */
export function placeFrom(text: string): string | undefined {
  const parts = text.split(/[,.;\n]+|\s+[-–—]\s+/).map(p => p.trim()).filter(Boolean);
  for (const p of parts) {
    const n = norm(p);
    if (/\?$/.test(p) || /^(yes|yep|yeah|sure|ok|okay|works|that works|lock it)\b/.test(n) && n.split(" ").length <= 2) continue;
    if (parseTime(p) || parseDates(p, new Date()).dates.length || parseDates(p, new Date()).past.length || /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/.test(n)) continue;
    const cleaned = p.replace(/^(yes|yep|yeah|sure)\s+/i, "").replace(/^(at|@)\s+/i, "").trim();
    if (/[a-z]{3,}/i.test(cleaned) && !/^(can|could|will|would|do|does|is|are|what|how|when)\b/i.test(cleaned)) return cleaned;
  }
  return undefined;
}

export function icsCalendar(events: { uid: string; start: Date; minutes: number; title: string; place: string; notes: string }[]): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Press Run//Run Sheet//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@pressrun`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(new Date(e.start.getTime() + e.minutes * 60_000))}`, `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.place)}`, `DESCRIPTION:${esc(e.notes)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
