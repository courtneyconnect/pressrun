// Press Stop onboarding, steps S0a–S8 of Press-Run/scripts/press-stop-onboarding-script.md.
// Making the card and clip (S8 → S9 approval) is the next build slice.

import type { Out, PressStop } from "../../types";
import type { Ctx, Result, Step } from "../engine";
import * as C from "../copy";
import { nameAndEmail } from "./booker";
import {
  extractName, extractSeriesName, fmtDate, isNo, isNyc, isYes, norm, parseCollab, parseContact, parseCount,
  parseDates, parseFormats, parseHandles, parseInterests, parseNoticeHours, parsePlatforms, parseRate,
} from "../parse";

export const STOP_FIRST = "S1";

async function current(ctx: Ctx): Promise<PressStop> {
  const st = ctx.account.state;
  const existing = st.stopId ? await ctx.store.stop(st.stopId) : null;
  if (existing) return existing;
  const stop = await ctx.store.createStop(ctx.account.id);
  st.stopId = stop.id;
  return stop;
}

async function edit(ctx: Ctx, fn: (s: PressStop) => void): Promise<PressStop> {
  const s = await current(ctx);
  fn(s);
  await ctx.store.saveStop(s);
  return s;
}

const series = (s: PressStop) => s.seriesName ?? "your show";

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", twitch: "Twitch", kick: "Kick",
  facebook: "Facebook", snapchat: "Snapchat", soundcloud: "SoundCloud", spotify: "Spotify",
};
const platformName = (p?: string) => (p && PLATFORM_NAMES[p]) || "that one";

const SEVERAL_RE = /\b(\d+|two|three|four|five|several|multiple|a few)\s+(series|shows)\b/i;
const S1_UNCLEAR = C.t('Just the show\'s name and a number from the list, e.g. "Music for a Minute, 1".');
const S4_TIERS = (text: string) => C.t(`Got it. I'll show “${text}” and send you each request to decide.`);
const S7_UNCLEAR = C.t('Send a photo or logo, or reply "use a frame".');

export const stopSteps: Record<string, Step> = {
  S0a: nameAndEmail(C.NAME_EMAIL_STOP, "S1"),

  S1: {
    async ask(ctx) {
      const a = ctx.account;
      await current(ctx);
      const opener = a.roles.length ? C.S1_EXISTING(a.memberNo) : C.S1_WELCOME(a.firstName ?? "there", a.memberNo);
      return [opener, C.S1_INTRO, C.S1_Q];
    },
    async answer(ctx) {
      if (!ctx.account.roles.includes("stop")) ctx.account.roles.push("stop");
      const formats = parseFormats(ctx.text);
      const name = extractSeriesName(ctx.text);
      const several = SEVERAL_RE.test(ctx.text);
      const s = await edit(ctx, s => {
        if (name && !(several && !s.seriesName && name.split(" ").length < 2)) s.seriesName = s.seriesName ?? name;
        if (formats.length && !s.format) { s.format = formats[0]; s.formatsExtra = formats.slice(1); }
      });
      const say: Out[] = [];
      if (several && !ctx.account.state.asked?.includes("several")) {
        ctx.account.state.asked = [...(ctx.account.state.asked ?? []), "several"];
        if (!s.seriesName) return { stay: [C.S1_SEVERAL] };
        say.push(C.S1_SEVERAL_NAMED(s.seriesName));
      }
      if (s.seriesName && s.format) return { next: "S1c", say };
      if (s.seriesName) return { stay: [...say, C.S1_NAME_ONLY] };
      if (s.format) return { stay: [...say, C.S1_FORMAT_ONLY] };
      return { unclear: [S1_UNCLEAR], giveUp: async () => { await edit(ctx, s => { s.seriesName = ctx.text.trim(); }); return { next: "S1c" }; } };
    },
  },

  S1c: {
    async ask(ctx) { return [C.S1_CREATOR(ctx.account.firstName ?? "there")]; },
    async answer(ctx) {
      const names = isYes(ctx.text) || /^me\b/i.test(ctx.text.trim())
        ? [ctx.account.firstName ?? "Me"]
        : ctx.text.split(/,|\band\b|&/).map(n => extractName(n)).filter((n): n is string => !!n);
      if (!names.length) return { unclear: [C.S1_CREATOR(ctx.account.firstName ?? "there")], giveUp: async () => ({ next: "S2" }) };
      await edit(ctx, s => { s.creatorNames = names; });
      return { next: "S2" };
    },
  },

  S2: {
    async ask(ctx) { return [C.S2(series(await current(ctx)))]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const s = await current(ctx);
      const pending = st.pending;
      if (pending?.startsWith("followers:")) {
        const p = s.platforms[Number(pending.slice(10))];
        if (p) p.followers = parseCount(ctx.text);
      } else if (pending?.startsWith("handle:")) {
        const p = s.platforms[Number(pending.slice(7))];
        const h = parseHandles(ctx.text).handles[0];
        if (p && h) { p.handle = h.handle; p.url = h.url; }
      } else {
        const entries = parsePlatforms(ctx.text);
        if (!entries.length) {
          return { unclear: [C.S2_VAGUE], giveUp: async () => ({ next: "S2b" }) };
        }
        s.platforms = entries;
      }
      st.pending = null;
      const asked = (st.asked ??= []);
      // Ask each missing piece once: follower counts first, then handles.
      const noCount = s.platforms.findIndex((p, i) => p.followers === undefined && !asked.includes(`f${i}`));
      const noHandle = s.platforms.findIndex((p, i) => !p.handle && !p.url && !asked.includes(`h${i}`));
      s.audienceTotal = s.platforms.reduce((sum, p) => sum + (p.followers ?? 0), 0) || undefined;
      await ctx.store.saveStop(s);
      if (noCount >= 0) { asked.push(`f${noCount}`); st.pending = `followers:${noCount}`; return { stay: [C.S2_NO_NUMBERS(platformName(s.platforms[noCount]!.platform))] }; }
      if (noHandle >= 0) { asked.push(`h${noHandle}`); st.pending = `handle:${noHandle}`; return { stay: [C.S2_NO_HANDLE(platformName(s.platforms[noHandle]!.platform))] }; }
      return { next: "S2b" };
    },
  },

  S2b: {
    async ask(ctx) { return [C.S2B(series(await current(ctx)))]; },
    async answer(ctx) {
      const { ids, unknown } = parseInterests(ctx.text, true);
      if (!ids.length && !unknown.length) {
        return { unclear: [C.S2B_UNCLEAR], giveUp: async () => { await edit(ctx, s => { s.general = true; }); return { next: "S3" }; } };
      }
      if (unknown.length) ctx.account.needsReview.push({ step: "stop:S2b interest", text: unknown.join(", "), at: ctx.now.toISOString() });
      await edit(ctx, s => { s.general = ids.includes("general"); s.interests = ids.filter(i => i !== "general"); });
      return { next: "S3" };
    },
  },

  S3: {
    async ask() { return [C.S3_WHERE, C.S3_DATES]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const say: Out[] = [];
      const { dates, past, flexible } = parseDates(ctx.text, ctx.now);
      const weekdays = /\b(any|every)\s+(mon|tue|wed|thu|fri|sat|sun)/i.test(ctx.text);
      const hasDates = dates.length > 0 || flexible || weekdays;
      const s = await current(ctx);
      if (st.pending !== "dates") {
        const cut = ctx.text.search(/\bopen\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d/i);
        const places = (cut > 0 ? ctx.text.slice(0, cut) : hasDates && cut === 0 ? "" : ctx.text).replace(/[.\s]+$/, "").trim();
        if (places) {
          s.placesText = places;
          s.remoteOk = /\bremote|call[- ]in|zoom\b/i.test(places);
          s.outsideNyc = !isNyc(places) && !s.remoteOk;
          if (s.outsideNyc) say.push(C.S3_OUTSIDE(places.split(/[,(]/)[0]!.trim()));
        }
      }
      if (hasDates) {
        s.openDates = dates;
        s.flexible = flexible;
        s.openText = weekdays || flexible ? ctx.text.slice(Math.max(0, ctx.text.search(/\bopen\b|\bany\b|\bevery\b|\bflexible\b|\bwhenever\b/i))).trim() : undefined;
        if (flexible) say.push(C.S3_FLEXIBLE);
        if (past.length) say.push(C.S3_PAST(past.map(fmtDate).join(", ")));
      }
      await ctx.store.saveStop(s);
      if (!s.placesText) return { unclear: [C.S3_WHERE], giveUp: async () => ({ next: "S4" }) };
      if (!hasDates && st.pending !== "dates") { st.pending = "dates"; return { stay: [...say, C.S3_DATES] }; }
      if (!hasDates) return { unclear: [C.S3_DATES], giveUp: async () => { await edit(ctx, x => { x.openText = ctx.text; x.flexible = true; }); return { next: "S4", say }; } };
      return { next: "S4", say };
    },
  },

  S4: {
    async ask() { return [C.S4_WHAT, C.S4_RATE]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const rate = parseRate(ctx.text);
      const s = await current(ctx);
      if (st.pending !== "rate" && st.pending !== "depends") s.deliverableText = ctx.text.trim();
      if (rate && !rate.depends) { s.rateLow = rate.low; s.rateHigh = rate.high; s.rateText = rate.text; }
      await ctx.store.saveStop(s);
      if (rate?.depends) { st.pending = "depends"; return { stay: [C.S4_DEPENDS] }; }
      if (!rate) {
        if (st.pending === "rate" || st.pending === "depends") return { unclear: [C.S4_RATE], giveUp: async () => { await edit(ctx, x => { x.rateText = ctx.text; }); return { next: "S5" }; } };
        st.pending = "rate";
        return { stay: [C.S4_RATE] };
      }
      const say: Out[] = [];
      if (rate.low === 0 && (rate.high ?? 0) > 0) say.push(S4_TIERS(rate.text));
      say.push(C.S4_FEE_NOTE);
      return { next: "S5", say };
    },
  },

  S5: {
    async ask() { return [C.S5_NOTICE, C.S5_CONTACT]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const s = await current(ctx);
      const notice = parseNoticeHours(ctx.text);
      if (notice !== undefined) s.noticeHours = notice;
      const contact = parseContact(ctx.text.replace(/\d+\s*(hours?|hrs?|days?|weeks?)/gi, " "));
      if (contact) s.bookingContact = contact;
      await ctx.store.saveStop(s);
      const say: Out[] = contact && !contact.self ? [C.S5_TEAMMATE_OK] : [];
      if (s.noticeHours === undefined && !st.asked?.includes("notice")) { (st.asked ??= []).push("notice"); return { stay: [...say, C.S5_NOTICE] }; }
      if (!s.bookingContact) return { unclear: [...say, C.S5_CONTACT_UNCLEAR], giveUp: async () => { await edit(ctx, x => { x.bookingContact = { self: true }; }); return { next: "S5b" }; } };
      return { next: "S5b", say };
    },
  },

  S5b: {
    async ask() { return [C.S5B]; },
    optional: { next: "S6", apply: async ctx => { await edit(ctx, s => { s.collab = "ask"; }); } },
    async answer(ctx) {
      await edit(ctx, s => { s.collab = parseCollab(ctx.text); });
      return { next: "S6" };
    },
  },

  S6: {
    takesMedia: true,
    async ask() { return C.S6; },
    async answer(ctx) {
      const st = ctx.account.state;
      if (st.pending === "rights") {
        if (isYes(ctx.text)) { await edit(ctx, s => { s.rightsConfirmed = true; }); return { next: "S7" }; }
        if (isNo(ctx.text)) { st.pending = null; await edit(ctx, s => { s.samples = []; }); return { stay: [C.S6_RIGHTS_NO] }; }
        return { unclear: [C.S6_RIGHTS], giveUp: async () => ({ next: "S7" }) };
      }
      const parsed = parseHandles(ctx.text);
      const videos = (ctx.input.media ?? []).filter(m => m.kind === "video").map(m => ({ mediaUrl: m.url }));
      const samples = [...parsed.posts.map(url => ({ url })), ...videos];
      if (!samples.length && parsed.handles.length) return { stay: [C.S6_PROFILE_LINK] };
      if (!samples.length) return { unclear: C.S6, giveUp: async () => ({ next: "S7" }) };
      await edit(ctx, s => { s.samples = [...s.samples, ...samples].slice(0, 5); });
      st.pending = "rights";
      return { stay: [...(samples.length < 3 ? [C.S6_ONE_IS_ENOUGH] : []), C.S6_RIGHTS] };
    },
  },

  S7: {
    takesMedia: true,
    async ask() { return [C.S7]; },
    async answer(ctx) {
      const image = ctx.input.media?.find(m => m.kind === "image");
      if (image) { await edit(ctx, s => { s.cover = image.url; }); return { next: "S8" }; }
      if (/\b(frame|you pick|whatever|any|idk|up to you)\b/i.test(norm(ctx.text))) { await edit(ctx, s => { s.cover = "frame"; }); return { next: "S8" }; }
      return { unclear: [S7_UNCLEAR], giveUp: async () => { await edit(ctx, s => { s.cover = "frame"; }); return { next: "S8" }; } };
    },
  },

  S8: {
    async ask() { return [C.S8]; },
    async auto(ctx) {
      await edit(ctx, s => { s.status = "building"; });
      return { next: "done" };
    },
    async answer(): Promise<Result> { return { next: "done" }; },
  },
};
