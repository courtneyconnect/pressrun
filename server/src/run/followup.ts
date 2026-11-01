// After the shoot (section 4 of both scripts): the Press Stop sends the edit,
// the booker approves it or asks for changes, the creator drops the live
// link, views come in, and the booker gets a recap once every stop has posted.
// The booker also rates the shoot.

import type { Ctx } from "../engine/engine";
import * as C from "../engine/copy";
import { norm, parseCount } from "../engine/parse";
import type { Conversation, Out, RunRequest } from "../types";
import { nyToUtc } from "./time";

type Store = Ctx["store"];

const LOVE = ["❤️", "❤", "👍", "🔥", "💯"];
const APPROVES = /^(approved?|approve it|looks (good|great)|love (it|this)|perfect|good to go|post it|yes|yep|yess+|ship it|all good)\b/;
const POST_LINK = /https?:\/\/\S*(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|fb\.watch|twitch\.tv)\S*|\b(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)\/\S+/i;

/** The after-shoot jobs, queued when a shoot is booked. Each checks the shoot time still matches. */
export async function queueAfterShoot(store: Store, c: Conversation): Promise<void> {
  const shoot = Date.parse(c.shootAt!);
  const date = c.proposal!.date!;
  // 6pm New York on the shoot day, or 2 hours after an evening shoot.
  const sixPm = nyToUtc(date, "18:00").getTime();
  const wrap = Math.max(sixPm, shoot + 2 * 36e5);
  await store.enqueue("shoot_wrap", { convId: c.id, shootAt: c.shootAt }, new Date(wrap));
  await store.enqueue("rate_ask", { convId: c.id, shootAt: c.shootAt }, new Date(shoot + 48 * 36e5));
}

export const shootDone = (c: Conversation, now: Date) => c.status === "booked" && !!c.shootAt && Date.parse(c.shootAt) <= now.getTime();

/** "instagram", "tiktok", "youtube"… from a post link. */
export function platformOf(url: string): string {
  const u = url.toLowerCase();
  if (/instagram|instagr\.am/.test(u)) return "Instagram";
  if (/tiktok/.test(u)) return "TikTok";
  if (/youtube|youtu\.be/.test(u)) return "YouTube";
  if (/twitch/.test(u)) return "Twitch";
  if (/x\.com|twitter/.test(u)) return "X";
  if (/facebook|fb\.watch/.test(u)) return "Facebook";
  return "Post";
}

export const postLinkIn = (text: string) => {
  const m = text.match(POST_LINK)?.[0];
  return m ? (m.startsWith("http") ? m : `https://${m}`).replace(/[).,!?]+$/, "") : undefined;
};

export interface Labels {
  stop: (c: Conversation) => Promise<string>;
  booker: (c: Conversation) => Promise<string>;
  talent: (c: Conversation) => Promise<string>;
  handle: (c: Conversation) => Promise<string | undefined>;
  creator: (c: Conversation) => Promise<string>;
}

/** The Press Stop sent a video after the shoot: it's the edit. */
export async function editFromStop(ctx: Ctx, c: Conversation, url: string, L: Labels): Promise<Out[]> {
  c.post ??= { stage: "waiting_edit", edits: [] };
  c.post.edits.push(url);
  c.post.stage = "in_review";
  c.post.awaitingChange = false;
  c.post.reviewSentAt = ctx.now.toISOString();
  c.lastToBookerAt = ctx.now.toISOString();
  await ctx.store.saveConversation(c);
  const v = c.post.edits.length;
  await ctx.notify(c.bookerId, [
    { ...C.EDIT_TO_BOOKER(await L.stop(c)), ref: `conv:${c.id}` },
    { type: "video", url, alt: `Edit v${v} from ${await L.stop(c)}`, ref: `edit:${c.id}:${v}` },
    { ...C.EDIT_HOW, ref: `conv:${c.id}` },
  ]);
  await ctx.store.enqueue("edit_nudge_booker", { convId: c.id, version: v }, new Date(ctx.now.getTime() + 48 * 36e5));
  await ctx.store.enqueue("edit_flag", { convId: c.id, version: v }, new Date(ctx.now.getTime() + 72 * 36e5));
  return [C.EDIT_GOT(await L.talent(c))];
}

/** The booker approved the edit. */
export async function approveEdit(ctx: Ctx, c: Conversation, L: Labels): Promise<Out[]> {
  c.post!.stage = "approved";
  c.post!.awaitingChange = false;
  c.lastToStopAt = ctx.now.toISOString();
  await ctx.store.saveConversation(c);
  const stop = (await ctx.store.stop(c.stopId))!;
  const talent = await L.talent(c);
  const out: Out[] = [C.EDIT_APPROVED_STOP(talent), C.COLLAB_REMIND(talent, await L.handle(c))];
  if (stop.collab === "yes") out.push(C.COLLAB_YES);
  if (stop.collab === "ask") out.push(C.COLLAB_ASK);
  await ctx.notify(c.contactId, out);
  return [C.EDIT_APPROVED_BOOKER(await L.creator(c))];
}

/** Booker's text or reaction while an edit waits for their OK. Null when it's something else. */
export async function bookerOnEdit(ctx: Ctx, c: Conversation, L: Labels, relay: (words: string) => Promise<Out[]>): Promise<Out[] | null> {
  if (c.post?.stage !== "in_review") return null;
  const r = ctx.input.reaction;
  if (r) {
    if (r.removed) return [];
    if (LOVE.includes(r.emoji)) return approveEdit(ctx, c, L);
    if (r.emoji === "👎") {
      c.post.awaitingChange = true;
      await ctx.store.saveConversation(c);
      return [C.EDIT_WHAT_CHANGE(await L.creator(c))];
    }
    return [];
  }
  if (!c.post.awaitingChange && APPROVES.test(norm(ctx.text)) && !ctx.text.includes("?") && norm(ctx.text).split(" ").length <= 6) return approveEdit(ctx, c, L);
  c.post.awaitingChange = false;
  await ctx.store.saveConversation(c);
  const out = await relay(ctx.text);
  await ctx.notify(c.contactId, [C.EDIT_SEND_NEW]);
  return [...out, C.SENT_TO(await L.stop(c))];
}

/** The Press Stop dropped the live link. */
export async function postedFromStop(ctx: Ctx, c: Conversation, url: string, L: Labels): Promise<Out[]> {
  c.post ??= { stage: "approved", edits: [] };
  c.post.stage = "posted";
  c.post.postUrl = url;
  c.post.postedAt = ctx.now.toISOString();
  c.lastToBookerAt = ctx.now.toISOString();
  await ctx.store.saveConversation(c);
  await ctx.notify(c.bookerId, [{ ...C.POSTED_BOOKER(await L.stop(c)), ref: `conv:${c.id}` }, { type: "link", url }]);
  await ctx.store.enqueue("views_ask", { convId: c.id }, new Date(ctx.now.getTime() + 7 * 864e5));
  return platformOf(url) === "Instagram" ? [C.POST_GOT, C.POST_IG] : [C.POST_GOT];
}

/** A number (or screenshot) after Press Run asked for the views. Null when it isn't one. */
export async function viewsFromStop(ctx: Ctx, c: Conversation): Promise<Out[] | null> {
  if (!c.post?.viewsAskedAt || c.post.views !== undefined) return null;
  const shot = ctx.input.media?.find(m => m.kind === "image");
  const n = shot ? undefined : parseCount(ctx.text.replace(/views?/i, ""));
  if (!shot && (n === undefined || !/^\s*[\d.,]+\s*[km]?\s*(views?)?\s*[.!]?\s*$/i.test(ctx.text))) return null;
  if (shot) {
    // A person reads screenshots for now (the admin page lists them).
    c.post.viewsScreenshot = shot.url;
    ctx.account.needsReview.push({ step: `views:${c.code}`, text: `Views screenshot: ${shot.url}`, at: ctx.now.toISOString() });
  } else c.post.views = n;
  await ctx.store.saveConversation(c);
  const req = await ctx.store.request(c.requestId);
  if (req) await maybeRecap(ctx, req);
  return [C.VIEWS_THANKS];
}

/** A 1–5 reply right after the rating question. */
export async function ratingFromBooker(ctx: Ctx, convs: Conversation[]): Promise<Out[] | null> {
  const m = ctx.text.trim().match(/^([1-5])(\s*(\/\s*5|stars?|⭐+))?[.!]?$/i);
  if (!m) return null;
  const last = (await ctx.store.lastOutText(ctx.account.id)) ?? "";
  if (!last.startsWith("How was your shoot with")) return null;
  const c = convs.filter(x => x.bookerId === ctx.account.id && x.ratingAskedAt && x.rating === undefined)
    .sort((a, b) => b.ratingAskedAt!.localeCompare(a.ratingAskedAt!))[0];
  if (!c) return null;
  c.rating = Number(m[1]);
  await ctx.store.saveConversation(c);
  if (c.rating <= 2) ctx.account.needsReview.push({ step: `rating:${c.code}`, text: `Rated ${c.rating}/5`, at: ctx.now.toISOString() });
  return [C.RATE_THANKS];
}

/** The recap goes once every booked stop has posted and reported views (or 14 days after the last shoot, by job). */
export async function maybeRecap(ctx: { store: Store; now: Date }, req: RunRequest): Promise<void> {
  if (req.recapSentAt) return;
  const booked = (await ctx.store.conversationsForRequest(req.id)).filter(c => c.status === "booked");
  if (!booked.length) return;
  // A screenshot waits for Courtney to type the number in on the admin page.
  if (booked.every(c => c.post?.stage === "posted" && c.post.views !== undefined)) {
    await ctx.store.enqueue("recap", { requestId: req.id }, ctx.now);
  }
}
