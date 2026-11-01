// Renders a Press Stop's card (1080×1350 PNG) and the 1-second "Booked through
// Press Run" end card for clips. Layout follows the clickable mockup's card.

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { PressStop } from "../types";
import { FORMAT_LABELS, fmtDate, INTERESTS, roundAudience } from "../engine/parse";

const COLORS = { ink: "#0A0A0B", char: "#19191B", line: "#2E2E33", fg: "#F4F4F5", muted: "#9A9AA2", red: "#F0413A", note: "#FF8F87" };

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
/** Tiny element builder for Satori (no JSX needed). */
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node =>
  ({ type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children } });

const fontFile = (pkg: string, file: string) => Bun.file(new URL(`../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url)).arrayBuffer();

let fontsCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800 | 900; style: "normal" }[]> | null = null;
function fonts() {
  fontsCache ??= Promise.all([
    fontFile("big-shoulders-display", "big-shoulders-display-latin-900-normal.woff").then(data => ({ name: "Display", data, weight: 900 as const, style: "normal" as const })),
    fontFile("big-shoulders-display", "big-shoulders-display-latin-800-normal.woff").then(data => ({ name: "Display", data, weight: 800 as const, style: "normal" as const })),
    fontFile("figtree", "figtree-latin-400-normal.woff").then(data => ({ name: "Body", data, weight: 400 as const, style: "normal" as const })),
    fontFile("figtree", "figtree-latin-600-normal.woff").then(data => ({ name: "Body", data, weight: 600 as const, style: "normal" as const })),
    fontFile("ibm-plex-mono", "ibm-plex-mono-latin-600-normal.woff").then(data => ({ name: "Mono", data, weight: 600 as const, style: "normal" as const })),
  ]);
  return fontsCache;
}

async function toPng(node: Node, width: number, height: number): Promise<Uint8Array> {
  const svg = await satori(node as never, { width, height, fonts: await fonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

const heart = (size: number, color: string) => ({
  type: "svg",
  props: { width: size, height: size, viewBox: "0 0 24 24", children: { type: "path", props: { fill: color, d: "M12 21s-7.5-4.6-10-9.3C.5 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.2 4.4 2.4h3.2c.8-1.2 2.2-2.4 4.4-2.4 3.7 0 5.5 3.9 4 7.2C19.5 16.4 12 21 12 21z" } } },
});

const BOROUGHS: [RegExp, string][] = [
  [/brooklyn|williamsburg|bushwick|bed-?stuy|dumbo|greenpoint|crown heights|park slope/i, "Brooklyn"],
  [/queens|astoria|flushing|long island city|\blic\b|jamaica/i, "Queens"],
  [/bronx/i, "The Bronx"],
  [/staten island/i, "Staten Island"],
  [/manhattan|soho|washington sq|union sq|harlem|midtown|times sq|bryant park|lower east side|\bles\b|chelsea|village|tribeca|uptown|downtown/i, "Manhattan"],
];
export const areaOf = (s: PressStop) =>
  s.remoteOk && !s.placesText ? "Remote" : BOROUGHS.find(([re]) => re.test(s.placesText ?? ""))?.[1] ?? (s.outsideNyc ? (s.placesText ?? "").split(/[,(]/)[0]!.trim() : "New York");

export const openLine = (s: PressStop) =>
  s.openDates.length
    ? s.openDates.slice(0, 3).map((d, i) => (i === 0 ? fmtDate(d) : String(Number(d.slice(8))))).join(" · ")
    : s.flexible ? "Flexible" : (s.openText ?? "Ask");

export const interestLine = (s: PressStop) =>
  [...s.interests.map(id => INTERESTS.find(i => i.id === id)?.label ?? id), ...(s.general ? ["General"] : [])].slice(0, 2).join(" · ");

/** Greedy word wrap: "MUSIC FOR A MINUTE" → ["MUSIC FOR", "A MINUTE"]. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines;
}

/** The card bookers see. `number` is drawn at send time; null shows "#" for the approval preview. */
export async function renderCard(stop: PressStop, number: number | null, coverDataUrl?: string): Promise<Uint8Array> {
  const W = 1080, H = 1350, coverH = 640;
  const title = (stop.seriesName ?? "Your show").toUpperCase();
  const lines = wrap(title, 10);
  const titleSize = lines.length > 3 ? 96 : 132;
  const creator = stop.creatorNames.length ? `with ${stop.creatorNames.join(" & ")}` : "";
  const fmt = `${FORMAT_LABELS[stop.format ?? "other"] ?? "Show"} · ${areaOf(stop)}`;
  const stat = (k: string, v: string, grow = 1) =>
    h("div", { flexDirection: "column", flexGrow: grow, flexBasis: 0, gap: 6 },
      h("div", { fontFamily: "Mono", fontSize: 26, letterSpacing: 3, color: COLORS.muted }, k.toUpperCase()),
      h("div", { fontFamily: "Display", fontWeight: 800, fontSize: 64, color: COLORS.fg }, v));
  // The glow is a gradient behind the stripes: blurred shadows take seconds to render.
  const glow = h("div", { position: "absolute", left: 0, right: 0, bottom: 0, height: 260, backgroundImage: "radial-gradient(ellipse at 50% 100%, rgba(240,65,58,0.55), rgba(240,65,58,0) 70%)" });
  const stripes = h("div", { position: "absolute", left: -80, right: -80, bottom: -24, height: 96, gap: 60, justifyContent: "center", transform: "skewX(-28deg)" },
    ...[0, 1, 2, 3].map(() => h("div", { width: 130, height: 96, backgroundColor: COLORS.red, borderRadius: 10 })));
  const cover = h("div", { position: "relative", width: W, height: coverH, overflow: "hidden", backgroundImage: `linear-gradient(160deg, #6b1512, ${COLORS.char})` },
    ...(coverDataUrl ? [{ type: "img", props: { src: coverDataUrl, width: W, height: coverH, style: { position: "absolute", left: 0, top: 0, width: W, height: coverH, objectFit: "cover" } } }, h("div", { position: "absolute", left: 0, top: 0, width: W, height: coverH, backgroundImage: "linear-gradient(180deg, rgba(10,10,11,0.15), rgba(10,10,11,0.75))" })] : [glow, stripes]),
    h("div", { position: "absolute", left: 48, top: 48, width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.red, alignItems: "center", justifyContent: "center", fontFamily: "Display", fontWeight: 900, fontSize: 76, color: "#fff" }, number === null ? "#" : String(number)),
    h("div", { position: "absolute", left: 56, right: 56, top: 200, flexDirection: "column", fontFamily: "Display", fontWeight: 900, fontSize: titleSize, lineHeight: 0.86, color: "#fff" }, ...lines.map(l => h("div", {}, l))));
  const info = h("div", { flexDirection: "column", padding: "40px 56px 44px", gap: 22, flexGrow: 1 },
    h("div", { fontFamily: "Display", fontWeight: 800, fontSize: 76, color: COLORS.fg, letterSpacing: 1 }, title),
    h("div", { fontFamily: "Body", fontSize: 36, color: COLORS.muted, marginTop: -10 }, [creator, fmt].filter(Boolean).join(" · ")),
    ...(interestLine(stop) ? [h("div", { fontFamily: "Body", fontWeight: 600, fontSize: 34, color: COLORS.fg }, interestLine(stop))] : []),
    h("div", { height: 2, backgroundColor: COLORS.line, marginTop: 6 }),
    h("div", { gap: 24 }, stat("Audience", stop.audienceTotal ? roundAudience(stop.audienceTotal) : "New"), stat("Rate", stop.rateText ?? "Ask")),
    stat("Open dates", openLine(stop)),
    h("div", { alignItems: "center", gap: 14, fontFamily: "Mono", fontSize: 28, letterSpacing: 2, color: COLORS.note, marginTop: "auto" },
      number === null ? "PREVIEW · NUMBER ADDED WHEN SENT" : `REPLY ${number} OR`, ...(number === null ? [] : [heart(34, COLORS.note), "TO SAVE"])));
  return toPng(h("div", { width: W, height: H, flexDirection: "column", backgroundColor: COLORS.char }, cover, info), W, H);
}

/** R2's master list: up to 20 numbered rows in the Run Sheet's look. */
export async function renderList(title: string, subtitle: string, rows: { number: number; stop: PressStop; why?: string }[]): Promise<Uint8Array> {
  const W = 1080, rowH = 132, headH = 260;
  const H = headH + rows.length * rowH + 110;
  const paper = "#F4F4F5", inkSoft = "#444", rule = "#DADADF";
  const row = (r: { number: number; stop: PressStop; why?: string }) =>
    h("div", { height: rowH, alignItems: "center", gap: 28, padding: "0 48px", borderTop: `2px solid ${rule}` },
      h("div", { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.red, color: "#fff", alignItems: "center", justifyContent: "center", fontFamily: "Display", fontWeight: 900, fontSize: 48, flexShrink: 0 }, String(r.number)),
      h("div", { flexDirection: "column", flexGrow: 1, gap: 4, minWidth: 0 },
        h("div", { fontFamily: "Body", fontWeight: 600, fontSize: 36, color: COLORS.ink }, r.stop.seriesName ?? "Show"),
        h("div", { fontFamily: "Body", fontSize: 26, color: inkSoft }, [r.stop.creatorNames.length ? `with ${r.stop.creatorNames.join(" & ")}` : "", `${FORMAT_LABELS[r.stop.format ?? "other"] ?? "Show"} · ${areaOf(r.stop)}`].filter(Boolean).join(" · ")),
        ...(r.why ? [h("div", { fontFamily: "Mono", fontSize: 22, color: COLORS.red, letterSpacing: 1 }, `INTEREST MATCH: ${r.why.replace(/[^\x20-\x7E]+/g, "").replace(/\(\s+/g, "(").toUpperCase()}`)] : [])),
      h("div", { flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 },
        h("div", { fontFamily: "Display", fontWeight: 800, fontSize: 40, color: COLORS.ink }, r.stop.rateText ?? "Ask"),
        h("div", { fontFamily: "Mono", fontSize: 22, color: inkSoft }, openLine(r.stop))));
  return toPng(
    h("div", { width: W, height: H, flexDirection: "column", backgroundColor: paper },
      h("div", { height: headH, flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 48px", backgroundColor: COLORS.ink },
        h("div", { fontFamily: "Mono", fontSize: 26, letterSpacing: 6, color: COLORS.red }, "PRESS RUN · OPTIONS"),
        h("div", { fontFamily: "Display", fontWeight: 900, fontSize: title.length > 22 ? 64 : 92, color: "#fff" }, title.toUpperCase()),
        h("div", { fontFamily: "Body", fontSize: 30, color: "#BBB" }, subtitle)),
      h("div", { flexDirection: "column" }, ...rows.map(row)),
      h("div", { height: 110, alignItems: "center", padding: "0 48px", borderTop: `3px dashed ${rule}`, fontFamily: "Mono", fontSize: 24, color: inkSoft, letterSpacing: 1 }, "REPLY WITH NUMBERS TO SEE CARDS, OR \"SHOW ME ALL\"")),
    W, H);
}

/** Last second of every sample clip. */
export async function renderEndCard(): Promise<Uint8Array> {
  const W = 720, H = 1280;
  return toPng(
    h("div", { width: W, height: H, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, backgroundColor: COLORS.ink, position: "relative" },
      h("div", { fontFamily: "Mono", fontSize: 26, letterSpacing: 5, color: COLORS.muted }, "BOOKED THROUGH"),
      h("div", { fontFamily: "Display", fontWeight: 900, fontSize: 120, color: "#fff" }, "PRESS RUN"),
      h("div", { position: "absolute", left: -60, right: -60, bottom: 180, height: 70, gap: 44, justifyContent: "center", transform: "skewX(-28deg)" },
        ...[0, 1, 2, 3].map(() => h("div", { width: 96, height: 70, backgroundColor: COLORS.red, borderRadius: 8 })))),
    W, H);
}

export interface RunSheetRow { day: string; time: string; series: string; creator: string; talent: string; place: string }

/** The Run Sheet: every booked stop in time order, easy to screenshot. */
export async function renderRunSheet(title: string, subtitle: string, rows: RunSheetRow[]): Promise<Uint8Array> {
  const W = 1080, rowH = 150, headH = 260;
  const H = headH + rows.length * rowH + 110;
  const paper = "#F4F4F5", inkSoft = "#444", rule = "#DADADF";
  const row = (r: RunSheetRow) =>
    h("div", { height: rowH, alignItems: "center", gap: 32, padding: "0 48px", borderTop: `2px solid ${rule}` },
      h("div", { width: 190, flexDirection: "column", flexShrink: 0, gap: 2 },
        h("div", { fontFamily: "Mono", fontSize: 24, color: COLORS.red, letterSpacing: 2 }, r.day.toUpperCase()),
        h("div", { fontFamily: "Display", fontWeight: 900, fontSize: 52, color: COLORS.ink }, r.time.toUpperCase())),
      h("div", { flexDirection: "column", flexGrow: 1, gap: 4, minWidth: 0 },
        h("div", { fontFamily: "Body", fontWeight: 600, fontSize: 36, color: COLORS.ink }, r.series),
        h("div", { fontFamily: "Body", fontSize: 26, color: inkSoft }, `with ${r.creator} · ${r.talent}`),
        h("div", { fontFamily: "Mono", fontSize: 22, color: inkSoft, letterSpacing: 1 }, `📍 ${r.place}`.replace(/[^\x20-\x7E]+/g, "").trim().toUpperCase())));
  return toPng(
    h("div", { width: W, height: H, flexDirection: "column", backgroundColor: paper },
      h("div", { height: headH, flexDirection: "column", justifyContent: "center", gap: 10, padding: "0 48px", backgroundColor: COLORS.ink },
        h("div", { fontFamily: "Mono", fontSize: 26, letterSpacing: 6, color: COLORS.red }, "PRESS RUN · RUN SHEET"),
        h("div", { fontFamily: "Display", fontWeight: 900, fontSize: title.length > 22 ? 64 : 92, color: "#fff" }, title.toUpperCase()),
        h("div", { fontFamily: "Body", fontSize: 30, color: "#BBB" }, subtitle)),
      h("div", { flexDirection: "column" }, ...rows.map(row)),
      h("div", { height: 110, alignItems: "center", padding: "0 48px", borderTop: `3px dashed ${rule}`, fontFamily: "Mono", fontSize: 24, color: inkSoft, letterSpacing: 1 }, "REMINDERS COME THE NIGHT BEFORE AND 1 HOUR BEFORE")),
    W, H);
}
