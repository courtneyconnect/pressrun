// Everything a booker texts about options they've been sent (booker script R2–R3):
// numbers, names, reactions, "full episode 2", "cheaper", "more like 2",
// "who's free Thursday?", "only podcasts", "show me all", "more".

import type { Ctx } from "../engine/engine";
import * as C from "../engine/copy";
import { fmtDate, isYes, norm, numbersIn, ordinalsIn, parseDates, parseRelativeWindow, weekdaysIn } from "../engine/parse";
import type { Out, PressStop, RunOption, RunRequest } from "../types";
import { andList, candidateDates, moneyIn, parseRequest, stopTypeWords, typeOfStop } from "./match";
import { askShortlisted } from "./relay";
import { assign, bookerContext, CARDS_AT_ONCE, findMatches, sendSet } from "./options";

type Go = (target: string, say: Out[]) => Promise<Out[]>;

const LOVE = ["❤️", "❤", "👍", "🔥", "💯"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Courtney from Music for a Minute and Motivation for a Minute" (one creator named once). */
export function whoText(stops: PressStop[]): string {
  const groups = new Map<string, string[]>();
  for (const s of stops) {
    const creator = s.creatorNames.join(" & ") || "the team";
    groups.set(creator, [...(groups.get(creator) ?? []), s.seriesName ?? "their show"]);
  }
  return andList([...groups].map(([creator, series]) => `${creator} from ${andList(series)}`));
}

const active = (r: RunRequest) => r.options.filter(o => o.state === "sent" || o.state === "shortlisted");
const numberText = (opts: RunOption[]) => andList(opts.map(o => String(o.number)));

async function stopsFor(ctx: Ctx, opts: RunOption[]): Promise<PressStop[]> {
  const out: PressStop[] = [];
  for (const o of opts) { const s = await ctx.store.stop(o.stopId); if (s) out.push(s); }
  return out;
}

const noticeText = (h?: number) => !h ? "no notice" : h % 168 === 0 ? `${h / 168} week${h > 168 ? "s'" : "'s"} notice` : h % 24 === 0 && h > 24 ? `${h / 24} days' notice` : `${h} hours' notice`;

function details(s: PressStop, n: number): Out {
  const plat = s.platforms.filter(p => p.followers).map(p => `${p.platform === "instagram" ? "IG" : p.platform === "tiktok" ? "TikTok" : p.platform === "youtube" ? "YouTube" : p.platform} ${Math.round((p.followers ?? 0) / 1000)}K`).join(" · ");
  const lines = [
    `${s.seriesName}, hosted by ${s.creatorNames.join(" & ") || "the team"}: ${s.deliverableText ?? ""}`.trim(),
    plat,
    `Films ${s.placesText ?? "in New York"}. Needs ${noticeText(s.noticeHours)}.`,
    s.fullEpisodeLinks[0] ? `Reply “full episode ${n}” to watch the whole thing.` : "",
  ];
  return C.t(lines.filter(Boolean).join("\n"));
}

/** First date in the request window that falls on a weekday: "Thursday Nov 13". */
function dayLabel(r: RunRequest, weekday: number): string {
  for (let d = new Date((r.start ?? new Date().toISOString().slice(0, 10)) + "T12:00:00Z"), i = 0; i < 14; i++, d = new Date(d.getTime() + 864e5)) {
    if (d.getUTCDay() === weekday) return `${DAY_NAMES[weekday]} ${fmtDate(d.toISOString().slice(0, 10))}`;
  }
  return DAY_NAMES[weekday]!;
}

/** True when Press Run's last text to this person was a shortlist ("…Want me to ask about dates?"). */
export async function answersShortlist(ctx: Ctx): Promise<boolean> {
  return /^Shortlist(ed)?\b/.test((await ctx.store.lastOutText(ctx.account.id)) ?? "");
}

export function looksLikeRun(ctx: Ctx): boolean {
  return parseDates(ctx.text, ctx.now).dates.length > 0 || parseDates(ctx.text, ctx.now).past.length > 0
    || !!parseRelativeWindow(ctx.text, ctx.now) && /\b(run|options|press|book|stops?|interviews?|podcasts?)\b/i.test(ctx.text)
    || /\b(give me (my )?options|press run|book (a )?run|plan a run)\b/i.test(ctx.text);
}

/** Booker texts after onboarding. Returns null when it isn't about options or a new run. */
export async function handleBooker(ctx: Ctx, go: Go): Promise<Out[] | null> {
  const a = ctx.account;
  const isBooker = a.roles.includes("booker");
  const open = isBooker ? await ctx.store.openRequest(a.id) : null;
  if (ctx.input.reaction) return open ? onReaction(ctx) : [];
  // Dates in the text mean a new request, not a pick ("Oct 20" isn't option 20).
  const d = parseDates(ctx.text, ctx.now);
  const newRun = d.dates.length > 0 || d.past.length > 0 || /\b(give me (my )?options|plan a (press )?run|book a (press )?run)\b/i.test(ctx.text);
  if (open && !newRun) {
    const r = await onCommand(ctx, open);
    if (r) return r;
  }
  if (!looksLikeRun(ctx)) return null;
  if (!isBooker) return go("booker:B1", [C.t("Let's set up booking first. Takes about 2 minutes.")]);

  const { profile, talent } = await bookerContext(ctx.store, a.id);
  if (open) { open.status = "closed"; await ctx.store.saveRequest(open); }
  const req = await ctx.store.createRequest(a.id, ctx.text);
  const p = parseRequest(ctx.text, ctx.now, profile, talent);
  req.start = p.start; req.end = p.end;
  if (!p.start && p.past.length) req.pastDate = p.past[0];
  req.city = p.city;
  req.talentIds = p.talentIds ?? [];
  req.needWho = p.needWho;
  if (p.budgetMax !== undefined) req.budgetMax = p.budgetMax;
  else if (profile.budgetHigh !== undefined || profile.budgetLow === 0) { req.budgetMax = profile.budgetHigh ?? 0; req.budgetText = profile.budgetText; req.usualBudget = true; }
  if (p.types.length) req.only.types = p.types;
  await ctx.store.saveRequest(req);
  a.state.requestId = req.id;
  return go("run:Rcheck", []);
}

async function onCommand(ctx: Ctx, req: RunRequest): Promise<Out[] | null> {
  const t = norm(ctx.text);
  const store = ctx.store;
  const byNumber = (n: number) => req.options.find(o => o.number === n);

  const full = t.match(/\b(?:full (?:episode|ep)|watch)\b\D*(\d+)/);
  if (full) {
    const o = byNumber(Number(full[1]));
    const s = o && (await store.stop(o.stopId));
    if (!s) return [C.R_ONLY_SENT(1, Math.max(1, ...active(req).map(x => x.number)))];
    const who = whoText([s]);
    return s.fullEpisodeLinks[0] ? [C.R_FULL(who), { type: "link", url: s.fullEpisodeLinks[0] }] : [C.R_NO_FULL(who)];
  }

  if (/\b(show (me )?(them )?all|see (them )?all|send (them )?all|all of them)\b/.test(t) && req.mode === "list") return page(ctx, req, 0);
  if (/^(more|next|next 5|more please|show more|send more)$/.test(t) && req.mode === "list") return page(ctx, req, req.cursor ?? 0);

  if (isYes(ctx.text) && (await answersShortlist(ctx))) return askShortlisted(ctx, req);
  if (/\b(ask them|book them|ask (them )?all|ask both|book (it|them|all)|send (the )?requests?|ask about dates)\b/.test(t)) {
    return askShortlisted(ctx, req);
  }

  if (/\b(cheaper|less expensive|lower (price|rate)s?|cheapest)\b/.test(t)) {
    const paid = active(req).map(o => o).length ? (await stopsFor(ctx, active(req))).map(s => s.rateLow ?? 0).filter(x => x > 0) : [];
    const cap = paid.length ? Math.min(...paid) - 1 : 0;
    const more = (await findMatches(store, req, ctx.now, { maxRate: cap })).slice(0, 3);
    if (!more.length) return [C.R_CHEAPEST];
    await sendSet(store, req, assign(req, more, "sent"), ctx.now, [C.R_CHEAPER], "none");
    return [];
  }

  const like = t.match(/\bmore like #?(\d+)\b|\b(?:similar to|like) #?(\d+)\b/);
  if (like) {
    const n = Number(like[1] ?? like[2]);
    const o = byNumber(n);
    const base = o && (await store.stop(o.stopId));
    if (!base) return [C.R_ONLY_SENT(1, Math.max(1, ...active(req).map(x => x.number)))];
    const more = (await findMatches(store, req, ctx.now)).filter(m => typeOfStop(m.stop) === typeOfStop(base) || m.stop.interests.some(i => base.interests.includes(i))).slice(0, 3);
    if (!more.length) return [C.R_NO_MORE_LIKE(n)];
    await sendSet(store, req, assign(req, more, "sent"), ctx.now, [C.R_MORE_LIKE(n)], "none");
    return [];
  }

  const wd = weekdaysIn(t);
  if (wd.length && /\bfree\b|\bavailable\b/.test(t) && !/\bonly\b/.test(t)) {
    const w = wd[0]!;
    const label = dayLabel(req, w);
    const temp = { ...req, only: { ...req.only, weekdays: [w] } };
    const fitting: RunOption[] = [];
    for (const o of active(req)) {
      const s = await store.stop(o.stopId);
      if (s && candidateDates(s, temp, ctx.now).length) fitting.push(o);
    }
    const out: Out[] = fitting.length ? [C.R_FREE_ON(label, numberText(fitting), whoText(await stopsFor(ctx, fitting)))] : [];
    const more = (await findMatches(store, req, ctx.now, { weekdays: [w] })).slice(0, 3);
    if (more.length) await sendSet(store, req, assign(req, more, "sent"), ctx.now, [C.R_ALSO_FREE(label.split(" ")[0]!)], "none");
    else out.push(C.R_NOBODY_ELSE(label));
    return out;
  }

  const types = stopTypeWords(t);
  const maxRate = /\bunder\b|\bless than\b|\bbelow\b/.test(t) ? moneyIn(t) : undefined;
  const onlyDay = /\bonly\b|\bjust\b/.test(t) ? wd : [];
  if ((types.length && /\bonly\b|\bjust\b/.test(t)) || maxRate !== undefined || onlyDay.length) {
    if (types.length) req.only.types = types;
    if (maxRate !== undefined) req.only.maxRate = maxRate;
    if (onlyDay.length) req.only.weekdays = onlyDay;
    const matches = await findMatches(store, req, ctx.now, {}, true);
    if (!matches.length) { await store.saveRequest(req); return [C.R_NONE]; }
    const opts = assign(req, matches, "listed");
    const fresh = opts.filter(o => o.state === "listed");
    if (opts.length > CARDS_AT_ONCE) { await sendSet(store, req, opts, ctx.now, [], "none"); return []; }
    const already = opts.filter(o => o.state !== "listed");
    if (fresh.length) await sendSet(store, req, fresh, ctx.now, [], "none");
    else await store.saveRequest(req);
    return already.length ? [C.t(`Already sent: ${numberText(already)}.`)] : [];
  }

  // Picking by number, ordinal or series name.
  const maxNumber = req.nextNumber - 1;
  const nums = [...numbersIn(t, maxNumber), ...ordinalsIn(t)];
  for (const o of req.options) {
    const s = await store.stop(o.stopId);
    if (s?.seriesName && t.includes(norm(s.seriesName)) && !nums.includes(o.number)) nums.push(o.number);
  }
  const outOfRange = numbersIn(t, 99).filter(n => n > maxNumber);
  if (!nums.length && outOfRange.length) return [C.R_ONLY_SENT(1, Math.max(1, maxNumber))];
  if (!nums.length) return null;
  const opts = nums.map(byNumber).filter((o): o is RunOption => !!o && o.state !== "dropped");
  if (!opts.length) return [C.R_ONLY_SENT(1, Math.max(1, maxNumber))];
  const toView = opts.filter(o => o.state === "listed");
  if (toView.length) {
    await sendSet(store, req, toView, ctx.now, [], "none");
    return [];
  }
  for (const o of opts) o.state = "shortlisted";
  await store.saveRequest(req);
  return [C.R_SHORTLISTED(numberText(opts), whoText(await stopsFor(ctx, opts)))];
}

/** "show me all" / "more" on the master list: 5 cards at a time. */
async function page(ctx: Ctx, req: RunRequest, from: number): Promise<Out[]> {
  const listed = req.options.filter(o => o.state === "listed" || o.state === "sent").sort((a, b) => a.number - b.number);
  const slice = listed.slice(from, from + CARDS_AT_ONCE);
  if (!slice.length) return [C.t("That's everyone on the list.")];
  req.cursor = from + slice.length;
  for (const o of slice) o.state = o.state === "listed" ? "sent" : o.state;
  await ctx.store.saveRequest(req);
  const outro = req.cursor < listed.length ? [C.R_PAGE(slice[0]!.number, slice[slice.length - 1]!.number)] : [];
  await ctx.store.enqueue("send_options", { requestId: req.id, numbers: slice.map(o => o.number), intro: [], outro: "none", after: outro }, ctx.now);
  return [];
}

async function onReaction(ctx: Ctx): Promise<Out[]> {
  const r = ctx.input.reaction!;
  const target = await ctx.store.messageById(r.targetProviderId);
  const ref = String(target?.data?.ref ?? "");
  const list = ref.match(/^list:(.+)$/);
  if (list) {
    const req = await ctx.store.request(list[1]!);
    if (!req || r.removed) return [];
    if (LOVE.includes(r.emoji)) return page(ctx, req, 0);
    if (r.emoji === "❓") return [C.R_LIST_Q];
    return [];
  }
  const m = ref.match(/^opt:(.+):(\d+)$/);
  if (!m) return [];
  const req = await ctx.store.request(m[1]!);
  const opt = req?.options.find(o => o.number === Number(m[2]));
  if (!req || !opt) return [];
  if (r.removed) {
    if (LOVE.includes(r.emoji) && opt.state === "shortlisted") opt.state = "sent";
    if (r.emoji === "👎" && opt.state === "dropped") opt.state = "sent";
    await ctx.store.saveRequest(req);
    return [];
  }
  if (LOVE.includes(r.emoji)) {
    opt.state = "shortlisted";
    req.lastReactionAt = ctx.now.toISOString() + "#" + crypto.randomUUID().slice(0, 8);
    await ctx.store.saveRequest(req);
    // One summary after 30 quiet seconds, however many hearts come in.
    await ctx.store.enqueue("shortlist_summary", { requestId: req.id, stamp: req.lastReactionAt }, new Date(ctx.now.getTime() + 30_000));
    return [];
  }
  if (r.emoji === "👎") {
    opt.state = "dropped";
    const s = await ctx.store.stop(opt.stopId);
    const { profile } = await bookerContext(ctx.store, req.bookerId);
    if (s?.format && !profile.fewerFormats?.includes(s.format)) {
      profile.fewerFormats = [...(profile.fewerFormats ?? []), s.format];
      await ctx.store.saveBooker(req.bookerId, profile);
    }
    await ctx.store.saveRequest(req);
    if (active(req).length < 3) {
      const next = (await findMatches(ctx.store, req, ctx.now)).slice(0, 1);
      if (next.length) await sendSet(ctx.store, req, assign(req, next, "sent"), ctx.now, [], "none");
    }
    return [C.R_DROPPED(opt.number)];
  }
  if (r.emoji === "❓") {
    const s = await ctx.store.stop(opt.stopId);
    return s ? [details(s, opt.number)] : [];
  }
  return [];
}
