// Tapbacks that arrive as text. Some iMessage services (and every SMS phone)
// pass a reaction along as words: `Loved “Shortlisted 1 and 3…”`, `Liked an image`,
// `Removed a heart from “…”`. This turns those into a reaction on the bubble they
// name, so ❤️ works the same however the line delivers it.

import type { Store } from "../db/store";
import type { Inbound } from "../types";

const VERBS: [RegExp, string][] = [
  [/^loved\b/i, "❤️"], [/^liked\b/i, "👍"], [/^disliked\b/i, "👎"], [/^laughed at\b/i, "😂"],
  [/^emphasi[sz]ed\b/i, "‼️"], [/^questioned\b/i, "❓"],
];
const REMOVED: [RegExp, string][] = [
  [/a heart/i, "❤️"], [/a like/i, "👍"], [/a dislike/i, "👎"], [/a laugh/i, "😂"], [/an exclamation/i, "‼️"], [/a question mark/i, "❓"],
];

export interface TextTapback { emoji: string; removed: boolean; quoted?: string; media?: "image" | "video" }

export function parseTextTapback(text: string): TextTapback | null {
  const t = text.trim();
  const quoted = t.match(/[“"](.+?)(?:…|\.\.\.)?[”"]\s*$/s)?.[1]?.trim();
  const media = /\b(an image|a photo|a picture)\s*$/i.test(t) ? "image" : /\b(a movie|a video)\s*$/i.test(t) ? "video" : undefined;
  if (!quoted && !media) return null;
  const removedMatch = t.match(/^removed (.+?) from\b/i);
  if (removedMatch) {
    const hit = REMOVED.find(([re]) => re.test(removedMatch[1]!));
    return hit ? { emoji: hit[1], removed: true, quoted, media } : null;
  }
  const hit = VERBS.find(([re]) => re.test(t));
  return hit ? { emoji: hit[1], removed: false, quoted, media } : null;
}

/** Turns a text tapback into a reaction on the newest bubble it names. Leaves anything else alone. */
export async function resolveTextTapback(store: Store, accountId: string, input: Inbound): Promise<Inbound> {
  if (input.reaction || !input.text) return input;
  const tb = parseTextTapback(input.text);
  if (!tb) return input;
  const out = await store.recentOut(accountId, 200);
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const target = tb.media
    ? out.find(m => m.kind === tb.media)
    : out.find(m => m.kind === "text" && m.body && norm(m.body).startsWith(norm(tb.quoted!).slice(0, 60)));
  if (!target) return input;
  return { ...input, text: "", reaction: { emoji: tb.emoji, targetProviderId: target.providerId ?? target.id, removed: tb.removed } };
}
