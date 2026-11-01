// Passing messages between a booker and a Press Stop (booker script R4–R5).
// Each person keeps one thread with Press Run. Every relayed message starts
// with who it's from, and numbers and emails stay hidden until their owner
// replies SHARE.

import type { Ctx } from "../engine/engine";
import * as C from "../engine/copy";
import { fmtDate, isNo, isYes, norm } from "../engine/parse";
import type { Account, Conversation, Out, PressStop, RunRequest, Talent } from "../types";
import { andList } from "./match";
import { answersShortlist, whoText } from "./picking";
import { dateInWindow, fmtWhen, nyToUtc, parseTime, placeFrom } from "./time";
import { bookerOnEdit, editFromStop, postedFromStop, postLinkIn, queueAfterShoot, ratingFromBooker, shootDone, viewsFromStop, type Labels } from "./followup";

type Side = "booker" | "stop";
type Store = Ctx["store"];

const PHONE_RE = /(\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
export const HIDDEN = "[number hidden by Press Run]";

/** Hides phone numbers and emails. Returns the cleaned text and what was hidden. */
export function hideContacts(text: string): { text: string; hidden: string[] } {
  const hidden: string[] = [];
  const out = text
    .replace(EMAIL_RE, m => (hidden.push(m), HIDDEN))
    .replace(PHONE_RE, m => (hidden.push(m.trim()), HIDDEN));
  return { text: out, hidden };
}

/** How the booker's side is labelled: the artist, "Nova Reign's team", or "{brand}'s team". */
export async function bookerLabel(store: Store, c: Conversation): Promise<string> {
  const talent = (await store.talentFor(c.bookerId)).filter(t => c.talentIds.includes(t.id));
  const profile = await store.booker(c.bookerId);
  if (profile.role === "self") return talent[0]?.name ?? (await store.accountById(c.bookerId))?.firstName ?? "The artist";
  if (profile.role === "brand") return `${profile.brandName ?? "The brand"}'s team`;
  return talent.length ? `${andList(talent.map(t => t.name))}'s team` : "The booker's team";
}

/** "Nova Reign" or "Nova Reign and Jay Mo": who is being booked. */
export async function talentNames(store: Store, c: Conversation): Promise<string> {
  const names = (await store.talentFor(c.bookerId)).filter(t => c.talentIds.includes(t.id)).map(t => t.name);
  return names.length ? andList(names) : bookerLabel(store, c);
}

export const stopLabel = async (store: Store, c: Conversation) => whoText([(await store.stop(c.stopId))!]);

/** "Nov 12–15" */
export function dateRange(start?: string, end?: string): string {
  if (!start) return "your dates";
  if (!end || end === start) return fmtDate(start);
  return `${fmtDate(start)}–${end.slice(5, 7) === start.slice(5, 7) ? Number(end.slice(8)) : fmtDate(end)}`;
}

/** The account that answers for a Press Stop: the owner, or the teammate they named in S5. */
async function contactFor(store: Store, s: PressStop): Promise<Account> {
  const bc = s.bookingContact;
  if (bc && !bc.self) {
    const existing = await store.accountByPhone(bc.phone);
    if (existing) return existing;
    return store.createAccount(bc.phone, { firstName: bc.name?.split(" ")[0], roles: ["team"] });
  }
  return (await store.accountById(s.ownerId))!;
}

/** The artist's profile link for the request: Instagram first, then any other. */
const profileLink = (t: Talent) => (t.handles.find(h => h.platform === "instagram" && h.url) ?? t.handles.find(h => h.url))?.url;

const rateLine = (s: PressStop) => (!s.rateLow && !s.rateHigh ? "Rate: free" : `Budget: within your ${s.rateText ?? "usual"} rate`);

/** "ask them": sends a booking request to each shortlisted Press Stop not already asked. */
export async function askShortlisted(ctx: Ctx, req: RunRequest): Promise<Out[]> {
  const already = new Set((await ctx.store.conversationsForRequest(req.id)).map(c => c.stopId));
  const opts = req.options.filter(o => o.state === "shortlisted" && !already.has(o.stopId));
  if (!opts.length) return [C.R_ASK_WHICH];
  const talent = (await ctx.store.talentFor(req.bookerId)).filter(t => req.talentIds.includes(t.id));
  const talentLine = talent.map(t => {
    const handle = t.handles.find(h => h.handle)?.handle;
    const bits = [t.nicheText, handle && (handle.startsWith("@") ? handle : `@${handle}`)].filter(Boolean).join(", ");
    return bits ? `${t.name} (${bits})` : t.name;
  }).join(" and ") || (await ctx.store.accountById(req.bookerId))?.firstName || "A booker";
  const stops: PressStop[] = [];
  for (const o of opts) {
    const s = await ctx.store.stop(o.stopId);
    if (!s) continue;
    stops.push(s);
    const contact = await contactFor(ctx.store, s);
    const c = await ctx.store.createConversation({ requestId: req.id, bookerId: req.bookerId, stopId: s.id, contactId: contact.id, talentIds: req.talentIds });
    const out: Out[] = [{ ...C.REQ_HEAD(c.code, talentLine, s.seriesName ?? "your show", `${dateRange(req.start, req.end)}, NYC`, rateLine(s)), ref: `conv:${c.id}` }];
    for (const t of talent.slice(0, 2)) { const url = profileLink(t); if (url) out.push({ type: "link", url }); }
    out.push({ ...C.REQ_REPLY, ref: `conv:${c.id}` });
    c.lastToStopAt = ctx.now.toISOString();
    await ctx.store.saveConversation(c);
    await ctx.notify(contact.id, out);
    // A nudge after 12 hours, and it expires at 24 if the Press Stop doesn't answer.
    await ctx.store.enqueue("conv_nudge", { convId: c.id }, new Date(ctx.now.getTime() + 12 * 36e5));
    await ctx.store.enqueue("conv_expire", { convId: c.id }, new Date(ctx.now.getTime() + 24 * 36e5));
  }
  req.status = "asked";
  await ctx.store.saveRequest(req);
  return [C.R_SENT(whoText(stops), dateRange(req.start, req.end))];
}

/** Booker texts that are about options (numbers, "cheaper"…), which picking handles. */
const OPTION_COMMAND = /^\s*(\d+(\s*(,|and|&)\s*\d+)*|ask them|book them|cheaper|show (me )?all|more|full episode.*|watch \d+|more like.*|who'?s free.*|only .*|under .*)\s*$/i;

/** Labels the after-shoot messages use. */
const labels = (store: Store): Labels => ({
  stop: c => stopLabel(store, c),
  booker: c => bookerLabel(store, c),
  talent: c => talentNames(store, c),
  creator: async c => (await store.stop(c.stopId))?.creatorNames.join(" & ") || "the creator",
  handle: async c => {
    const h = (await store.talentFor(c.bookerId)).find(t => c.talentIds.includes(t.id))?.handles.find(x => x.handle)?.handle;
    return h && (h.startsWith("@") ? h : `@${h}`);
  },
});

/** Booked conversations stay open for messages until the post goes live. */
const isOpen = (c: Conversation) => c.status === "asked" || c.status === "talking" || (c.status === "booked" && c.post?.stage !== "posted");

const NEW_RUN = /\b(give me (my )?options|plan a (press )?run|book a (press )?run|new run|press run for)\b/i;

/** Texts about an ongoing conversation. Returns null when it isn't one. */
export async function handleRelay(ctx: Ctx): Promise<Out[] | null> {
  const a = ctx.account;
  const all = await ctx.store.conversationsFor(a.id);
  if (!all.length) return null;
  if (/^share$/.test(norm(ctx.text))) return share(ctx, all);
  const sideOf = (c: Conversation): Side => (c.contactId === a.id ? "stop" : "booker");
  const L = labels(ctx.store);

  // After the shoot: ratings, the edit, the live link and views.
  if (!ctx.input.reaction) {
    const rated = await ratingFromBooker(ctx, all);
    if (rated) return rated;
  }
  if (ctx.input.reaction) {
    const target = await ctx.store.messageById(ctx.input.reaction.targetProviderId);
    const ref = String((target?.data as { ref?: string } | null)?.ref ?? "").match(/^edit:([^:]+):(\d+)$/);
    const c = ref && all.find(x => x.id === ref[1] && sideOf(x) === "booker");
    return c ? bookerOnEdit(ctx, c, L, w => pass(ctx, c, "booker", w)) : null;
  }
  const shot = all.filter(c => sideOf(c) === "stop" && shootDone(c, ctx.now));
  if (shot.length) {
    const views = shot.filter(c => c.post?.viewsAskedAt && c.post.views === undefined).sort((x, y) => y.post!.viewsAskedAt!.localeCompare(x.post!.viewsAskedAt!))[0];
    const v = views && (await viewsFromStop(ctx, views));
    if (v) return v;
    const notPosted = shot.filter(c => c.post?.stage !== "posted");
    const video = ctx.input.media?.find(m => m.kind === "video");
    const link = postLinkIn(ctx.text);
    if ((video || link) && notPosted.length) {
      const picked = notPosted.length === 1 ? { c: notPosted[0]! } : await pickConversation(ctx, notPosted, sideOf);
      if ("ask" in picked) return [picked.ask];
      return video ? editFromStop(ctx, picked.c, video.url, L) : postedFromStop(ctx, picked.c, link!, L);
    }
  }

  const open = all.filter(isOpen);
  if (!open.length || !ctx.text) return null;
  // Booker commands about options (numbers, "cheaper"…) and new runs belong to picking.
  if (open.every(c => sideOf(c) === "booker") && (OPTION_COMMAND.test(ctx.text) || NEW_RUN.test(ctx.text) || (isYes(ctx.text) && (await answersShortlist(ctx))))) return null;

  const picked = await pickConversation(ctx, open, sideOf);
  if ("ask" in picked) return [picked.ask];
  const c = picked.c;
  if (sideOf(c) === "stop") return fromStop(ctx, c);
  return (await bookerOnEdit(ctx, c, L, w => pass(ctx, c, "booker", w))) ?? fromBooker(ctx, c);
}

/** Which conversation a text is about: the bubble it replies to, a #PR code, a name, the only one, or the latest. */
async function pickConversation(ctx: Ctx, open: Conversation[], sideOf: (c: Conversation) => Side): Promise<{ c: Conversation } | { ask: Out }> {
  if (ctx.input.replyToProviderId) {
    const m = await ctx.store.messageById(ctx.input.replyToProviderId);
    const ref = String((m?.data as { ref?: string } | null)?.ref ?? "").match(/^conv:(.+)$/);
    const c = ref && open.find(x => x.id === ref[1]);
    if (c) return { c };
  }
  const code = ctx.text.match(/#?PR-(\d{4,})/i);
  if (code) { const c = open.find(x => x.code === `PR-${code[1]}`); if (c) return { c }; }
  const t = norm(ctx.text);
  const named: Conversation[] = [];
  for (const c of open) {
    if (sideOf(c) === "booker") {
      const s = await ctx.store.stop(c.stopId);
      if (s?.seriesName && t.includes(norm(s.seriesName))) named.push(c);
    } else {
      const tl = (await ctx.store.talentFor(c.bookerId)).filter(x => c.talentIds.includes(x.id));
      if (tl.some(x => new RegExp(`\\b${norm(x.name.split(" ")[0]!)}\\b`).test(t))) named.push(c);
    }
  }
  if (named.length === 1) return { c: named[0]! };
  if (open.length === 1) return { c: open[0]! };
  // "lock it" with exactly one time waiting to be locked.
  if (LOCKS.test(t)) {
    const lockable = (named.length > 1 ? named : open).filter(c => sideOf(c) === "booker" && c.status === "talking" && c.proposal?.date && c.proposal.time);
    if (lockable.length === 1) return { c: lockable[0]! };
  }
  // Otherwise the conversation that last messaged this person, if that was in the past 12 hours and clearly the latest.
  const lastAt = (c: Conversation) => Date.parse((sideOf(c) === "booker" ? c.lastToBookerAt : c.lastToStopAt) ?? "1970-01-01T00:00:00Z");
  const pool = named.length > 1 ? named : open;
  const recent = [...pool].sort((x, y) => lastAt(y) - lastAt(x));
  if (ctx.now.getTime() - lastAt(recent[0]!) <= 12 * 36e5 && lastAt(recent[0]!) > lastAt(recent[1]!)) return { c: recent[0]! };
  const label = async (c: Conversation) => (sideOf(c) === "booker" ? stopLabel(ctx.store, c) : bookerLabel(ctx.store, c));
  return { ask: C.WHICH_CONV(await label(recent[0]!), await label(recent[1]!)) };
}

/** Passes words to the other side with the sender's label, hiding contact details. */
async function pass(ctx: Ctx, c: Conversation, from: Side, words: string, extra: Out[] = []): Promise<Out[]> {
  const { text, hidden } = hideContacts(words);
  const label = from === "booker" ? await bookerLabel(ctx.store, c) : await stopLabel(ctx.store, c);
  const toId = from === "booker" ? c.contactId : c.bookerId;
  if (from === "booker") c.lastToStopAt = ctx.now.toISOString(); else c.lastToBookerAt = ctx.now.toISOString();
  if (hidden.length) c.hidden[from] = [...c.hidden[from], ...hidden];
  await ctx.store.saveConversation(c);
  await ctx.notify(toId, [{ ...C.RELAY(label, text), ref: `conv:${c.id}` }, ...extra]);
  if (!hidden.length) return [];
  return [C.HID_NUMBER(from === "booker" ? await stopLabel(ctx.store, c) : await bookerLabel(ctx.store, c))];
}

const PASSES = /\b(pass|can'?t|cannot|not available|unavailable|no thanks|decline|booked up|fully booked)\b/;
const AGREES = /\b(works|available|down|let'?s do|we can|can do|open)\b/;

async function fromStop(ctx: Ctx, c: Conversation): Promise<Out[]> {
  const t = norm(ctx.text);
  const req = (await ctx.store.request(c.requestId))!;

  if (c.status === "asked" && !isYes(ctx.text) && (isNo(ctx.text) || PASSES.test(t))) {
    c.status = "declined";
    await ctx.store.saveConversation(c);
    await ctx.notify(c.bookerId, [C.BOOKER_PASSED(await stopLabel(ctx.store, c))]);
    await settleRun(ctx, req);
    return [C.STOP_PASS_OK];
  }

  const date = dateInWindow(ctx.text, ctx.now, req.start, req.end);
  const time = parseTime(ctx.text);
  if (!date && !time) {
    if (c.status === "asked" && (isYes(ctx.text) || AGREES.test(t))) return [C.ASK_DETAILS];
    if (c.status === "asked") c.status = "talking";
    return [...(await pass(ctx, c, "stop", ctx.text)), C.SENT_TO(await bookerLabel(ctx.store, c))];
  }

  // A day and/or time: the proposal the booker can lock.
  const stop = (await ctx.store.stop(c.stopId))!;
  c.proposal = { date: date ?? c.proposal?.date, time: time ?? c.proposal?.time, place: placeFrom(ctx.text) ?? c.proposal?.place ?? stop.placesText };
  const complete = !!(c.proposal.date && c.proposal.time);
  if (c.status === "asked" && !complete) {
    await ctx.store.saveConversation(c);
    return [C.ASK_DETAILS];
  }
  if (c.status === "asked") c.status = "talking";
  const words = ctx.text.replace(/^\s*(yes|yep|yeah|yea|sure|ok|okay)\b[,!.\s]*/i, "").trim() || fmtWhen(c.proposal.date!, c.proposal.time);
  const changed = c.status === "booked" && complete && nyToUtc(c.proposal.date!, c.proposal.time!).toISOString() !== c.shootAt;
  const hint = complete && (c.status === "talking" || changed) ? [C.RELAY_LOCK_HINT] : [];
  return [...(await pass(ctx, c, "stop", words, hint)), C.SENT_TO(await bookerLabel(ctx.store, c))];
}

const LOCKS = /\b(lock (it|that|them|this)( in)?|book (it|that)|confirm(ed)?|that works|sounds good|perfect|let'?s do (it|that)|deal)\b/;

async function fromBooker(ctx: Ctx, c: Conversation): Promise<Out[]> {
  const t = norm(ctx.text);
  const who = await stopLabel(ctx.store, c);
  if (c.status === "booked" && /\blate\b/.test(t) && t.split(" ").length <= 8) {
    const mins = Number(t.match(/\b(\d{1,3})\s*(?:min|minutes?|mins)?\b/)?.[1] ?? 15);
    c.lastToStopAt = ctx.now.toISOString();
    await ctx.store.saveConversation(c);
    await ctx.notify(c.contactId, [{ ...C.RELAY(await bookerLabel(ctx.store, c), `running about ${mins} min late.`), ref: `conv:${c.id}` }]);
    return [C.LATE_TOLD(who)];
  }
  const short = t.split(" ").length <= 8 && !t.includes("?");
  if (LOCKS.test(t) && (short || /\block\b/.test(t))) {
    const p = c.proposal;
    if (!p?.date || !p.time) {
      if (c.status !== "booked") return [C.NO_TIME_YET(who)];
    } else if (c.status !== "booked" || nyToUtc(p.date, p.time).toISOString() !== c.shootAt) {
      return book(ctx, c);
    }
  }
  return pass(ctx, c, "booker", ctx.text);
}

/** Both sides agreed: book it, tell both, queue the calendar file and reminders. */
async function book(ctx: Ctx, c: Conversation): Promise<Out[]> {
  const p = c.proposal!;
  const rebook = c.status === "booked";
  c.status = "booked";
  c.shootAt = nyToUtc(p.date!, p.time!).toISOString();
  const when = fmtWhen(p.date!, p.time);
  const place = p.place ?? "place TBD";
  const hiddenNote = await pass(ctx, c, "booker", ctx.text, [C.BOOKED_STOP(await talentNames(ctx.store, c), when, place)]);
  await ctx.store.enqueue("stop_calendar", { convId: c.id }, ctx.now);
  // Night before at 8pm New York time, and 1 hour before. Each reminder checks the time still matches.
  const shoot = Date.parse(c.shootAt);
  const dayBefore = new Date(Date.parse(p.date! + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
  const nightBefore = nyToUtc(dayBefore, "20:00");
  if (nightBefore.getTime() > ctx.now.getTime()) await ctx.store.enqueue("reminder", { convId: c.id, kind: "night", shootAt: c.shootAt }, nightBefore);
  if (shoot - 36e5 > ctx.now.getTime()) await ctx.store.enqueue("reminder", { convId: c.id, kind: "hour", shootAt: c.shootAt }, new Date(shoot - 36e5));
  await queueAfterShoot(ctx.store, c);
  const req = (await ctx.store.request(c.requestId))!;
  const waiting = (await ctx.store.conversationsForRequest(req.id)).some(x => x.id !== c.id && (x.status === "asked" || x.status === "talking"));
  const out: Out[] = [C.BOOKED_BOOKER(await stopLabel(ctx.store, c), when, place), ...(waiting && !rebook ? [C.RUNSHEET_SOON] : []), ...hiddenNote];
  await settleRun(ctx, req, rebook);
  return out;
}

/** Queues the Run Sheet once every Press Stop asked has answered or expired (and again after a time change). */
export async function settleRun(ctx: { store: Store; now: Date }, req: RunRequest, force = false): Promise<void> {
  const convs = await ctx.store.conversationsForRequest(req.id);
  if (convs.some(c => c.status === "asked" || c.status === "talking")) return;
  if (!convs.some(c => c.status === "booked")) return;
  if (req.runSheetSentAt && !force) return;
  await ctx.store.enqueue("runsheet", { requestId: req.id }, ctx.now);
}

/** SHARE: the sender's own hidden numbers go to the other side of their latest conversation. */
async function share(ctx: Ctx, all: Conversation[]): Promise<Out[]> {
  const a = ctx.account;
  const sideOf = (c: Conversation): Side => (c.contactId === a.id ? "stop" : "booker");
  const lastFrom = (c: Conversation) => Date.parse((sideOf(c) === "booker" ? c.lastToStopAt : c.lastToBookerAt) ?? "1970-01-01T00:00:00Z");
  const c = all.filter(x => x.hidden[sideOf(x)].length).sort((x, y) => lastFrom(y) - lastFrom(x))[0];
  if (!c) return [C.NOTHING_TO_SHARE];
  const side = sideOf(c);
  const mine = side === "booker" ? await bookerLabel(ctx.store, c) : await stopLabel(ctx.store, c);
  const theirs = side === "booker" ? await stopLabel(ctx.store, c) : await bookerLabel(ctx.store, c);
  const values = [...new Set(c.hidden[side])];
  c.hidden[side] = [];
  await ctx.store.saveConversation(c);
  await ctx.notify(side === "booker" ? c.contactId : c.bookerId, values.map(v => C.SHARED_OTHER(mine, v)));
  return [C.SHARED(theirs)];
}
