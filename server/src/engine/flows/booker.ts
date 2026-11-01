// Booker onboarding, steps B0–B9 of Press-Run/scripts/booker-onboarding-script.md.

import type { BookerProfile, Out, Talent } from "../../types";
import type { Ctx, Result, Step } from "../engine";
import * as C from "../copy";
import {
  extractEmail, extractName, fmtDate, interestEmojis, isNo, isNyc, isYes, norm, numbersIn,
  parseBudget, parseDates, parseHandles, parseHardNos, parseInterests, parseRole, parseRoster, parseStopTypes,
  STOP_TYPE_LABELS,
} from "../parse";

export const BOOKER_FIRST = "B1";

// ---------- helpers ----------

async function profile(ctx: Ctx): Promise<BookerProfile> {
  return ctx.store.booker(ctx.account.id);
}

async function update(ctx: Ctx, fn: (p: BookerProfile) => void): Promise<BookerProfile> {
  const p = await profile(ctx);
  fn(p);
  await ctx.store.saveBooker(ctx.account.id, p);
  return p;
}

const NICHE_TAGS: [RegExp, string][] = [
  [/\b(rap|hip[- ]?hop|drill|trap)\b/, "hip-hop"],
  [/\br&b|rnb|r and b|soul\b/, "r&b"],
  [/\bpop\b/, "pop"],
  [/\b(latin|reggaeton|bachata|salsa)\b/, "latin"],
  [/\bafro(beats?)?\b/, "afrobeats"],
  [/\b(rock|indie|punk|alt)\b/, "rock/indie"],
  [/\bcountry\b/, "country"],
  [/\b(edm|electronic|house|techno|dj)\b/, "electronic"],
  [/\bgospel\b/, "gospel"],
  [/\b(film|movie|actor|actress|acting)\b/, "film"],
  [/\b(tv|television|series)\b/, "tv"],
  [/\b(comedy|comedian|stand-?up)\b/, "comedy"],
  [/\b(lifestyle|vlog)\b/, "lifestyle"],
  [/\b(fitness|gym)\b/, "fitness"],
  [/\b(fashion|style)\b/, "fashion"],
  [/\b(beauty|makeup|skincare)\b/, "beauty"],
  [/\bfood\b/, "food"],
  [/\bgaming\b/, "gaming"],
  [/\btech\b/, "tech"],
];
const MUSIC = new Set(["hip-hop", "r&b", "pop", "latin", "afrobeats", "rock/indie", "country", "electronic", "gospel"]);

export const nicheTags = (text: string) => NICHE_TAGS.filter(([re]) => re.test(norm(text))).map(([, tag]) => tag);

/** "music", "acting", "comedy" or "content" for "What's Nova into outside of …?" */
function craft(text: string | undefined): string {
  const tags = nicheTags(text ?? "");
  if (tags.some(t => MUSIC.has(t))) return "music";
  if (tags.includes("film") || tags.includes("tv")) return "acting";
  if (tags.includes("comedy")) return "comedy";
  return tags.length ? "content" : "your work";
}

/** "Nova is R&B, Jay is drill" → each artist's part of the sentence. */
function splitPerArtist(text: string, talent: Talent[]): Map<string, string> {
  const hits = talent
    .map(tl => ({ tl, i: norm(text).indexOf(norm(tl.name).split(" ")[0]!) }))
    .filter(h => h.i >= 0)
    .sort((a, b) => a.i - b.i);
  const out = new Map<string, string>();
  hits.forEach((h, k) => out.set(h.tl.id, text.slice(h.i, hits[k + 1]?.i ?? text.length).replace(/^\S+\s*(is|=|:|-)?\s*/i, "").replace(/[,.;]\s*$/, "").trim()));
  return out;
}

const RELEASE_RE = /\b(single|album|ep|mixtape|movie|film|show|premiere|tour|release|drop|special)\b/i;

function findRelease(ctx: Ctx): { text: string; date?: string } | undefined {
  if (!RELEASE_RE.test(ctx.text)) return undefined;
  const { dates } = parseDates(ctx.text, ctx.now);
  if (!dates.length) return undefined;
  const who = ctx.text.match(/\b([A-Z][a-z]+)'s\s+(single|album|ep|mixtape|movie|film|show|premiere|tour|special)\b/);
  return { text: who ? `${who[1]}'s ${who[2]}` : "your release", date: dates[0] };
}

const first = (ctx: Ctx) => ctx.account.firstName ?? "there";

// ---------- name + email (no website sign-up) ----------

export const nameAndEmail = (askFirst: Out, next: string): Step => ({
  async ask() { return [askFirst]; },
  async answer(ctx): Promise<Result> {
    const a = ctx.account;
    const email = extractEmail(ctx.text);
    if (!email && /@/.test(ctx.text) && !/\s@\w/.test(ctx.text)) return { stay: [C.BAD_EMAIL] };
    const name = extractName(ctx.text);
    if (email) a.email = email;
    if (name && (!a.firstName || !email)) a.firstName = a.firstName ?? name.split(" ")[0];
    if (a.firstName && a.email) return { next };
    if (a.firstName) return { stay: [C.ASK_EMAIL] };
    if (a.email) return { stay: [C.ASK_NAME] };
    return { unclear: [askFirst], giveUp: async () => ({ next }) };
  },
});

// ---------- steps ----------

export const bookerSteps: Record<string, Step> = {
  B0: {
    async ask() { return C.B0; },
    async answer(ctx) {
      const t = norm(ctx.text);
      const n = numbersIn(t, 2);
      const both = /\bboth\b/.test(t) || (n.includes(1) && n.includes(2));
      const book = n.includes(1) || /\b(book|booker|booking|artist|manager|label|brand)\b/.test(t);
      const list = n.includes(2) || /\b(list|stop|my show|podcast|series|host)\b/.test(t);
      if (both) { ctx.account.state.then = "stop"; return { next: "B0a" }; }
      if (book) return { next: "B0a" };
      if (list) return { next: "stop:S0a" };
      return { unclear: [C.B0_UNCLEAR], giveUp: async () => ({ next: "B0a" }) };
    },
  },

  B0a: nameAndEmail(C.NAME_EMAIL_BOOKER, "B1"),

  B1: {
    async ask(ctx) { return [C.B1_WELCOME(first(ctx), ctx.account.memberNo), C.B1_INTRO, C.B1_ROLE]; },
    async answer(ctx) {
      const role = parseRole(ctx.text);
      if (!ctx.account.roles.includes("booker")) ctx.account.roles.push("booker");
      const route = (r: string) => (r === "self" ? "B2self" : r === "brand" ? "B2brand" : "B2roster");
      if (!role) {
        return {
          unclear: [C.B1_UNCLEAR],
          giveUp: async () => { await update(ctx, p => { p.role = "self"; }); return { next: "B2self" }; },
        };
      }
      await update(ctx, p => { p.role = role.primary; p.extraRoles = role.extra; });
      return { next: route(role.primary) };
    },
  },

  B2self: {
    async ask() { return [C.B2_SELF]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const p = await profile(ctx);
      if (st.pending?.startsWith("platform:")) {
        const handle = st.pending.slice(9);
        const platform = parseHandles(`${handle} ${ctx.text}`).handles.find(h => h.handle === handle)?.platform
          ?? (/\b(ig|insta|instagram)\b/i.test(ctx.text) ? "instagram" : /\btiktok\b/i.test(ctx.text) ? "tiktok" : undefined);
        const h = p.handles.find(x => x.handle === handle);
        if (h && platform) h.platform = platform;
        await ctx.store.saveBooker(ctx.account.id, p);
        return { next: "B3" };
      }
      if (st.pending === "handle") {
        if (!isNo(ctx.text) && !/\bnone\b/i.test(ctx.text)) {
          const parsed = parseHandles(ctx.text);
          p.handles.push(...parsed.handles);
          const self = (await ctx.store.talentFor(ctx.account.id))[0];
          if (self) { self.handles = p.handles; await ctx.store.saveTalent(self); }
        }
        await ctx.store.saveBooker(ctx.account.id, p);
        return { next: "B3" };
      }
      const parsed = parseHandles(ctx.text);
      const entry = parseRoster(ctx.text)[0];
      if (!parsed.handles.length && parsed.posts.length) return { stay: [C.POST_NOT_PROFILE] };
      const name = entry?.name ?? (parsed.handles[0]?.handle ?? "").replace(/^@/, "");
      if (!name) return { unclear: [C.B2_SELF], giveUp: async () => ({ next: "B3" }) };
      p.selfName = name;
      p.handles = parsed.handles;
      await ctx.store.saveBooker(ctx.account.id, p);
      await ctx.store.clearTalent(ctx.account.id);
      await ctx.store.addTalent(ctx.account.id, { name, handles: parsed.handles, interests: [] });
      if (!parsed.handles.length) { st.pending = "handle"; return { stay: [C.B2_SELF_NO_HANDLE] }; }
      if (parsed.platformless.length) { st.pending = "platform:" + parsed.platformless[0]; return { stay: [C.PLATFORM_FOR(parsed.platformless[0]!)] }; }
      return { next: "B3" };
    },
  },

  B2roster: {
    async ask() { return [C.B2_ROSTER]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const p = await profile(ctx);
      if (st.pending === "company") {
        p.company = ctx.text.trim();
        await ctx.store.saveBooker(ctx.account.id, p);
        return { next: "B3" };
      }
      if (st.pending === "names") {
        const names = ctx.text.split(/\n|,|\band\b|&/).map(s => s.trim()).filter(Boolean);
        const talent = await ctx.store.talentFor(ctx.account.id);
        talent.forEach((tl, i) => { if (names[i]) tl.name = names[i]!; });
        for (const tl of talent) await ctx.store.saveTalent(tl);
        return p.role === "label" ? (st.pending = "company", { stay: [C.B2_COMPANY] }) : { next: "B3" };
      }
      if (/\b(too many|a lot|lots|tons|so many)\b/i.test(ctx.text)) return { stay: [C.B2_ROSTER_VAGUE] };
      const entries = parseRoster(ctx.text);
      if (!entries.length) return { unclear: [C.B2_ROSTER_VAGUE], giveUp: async () => ({ next: "B3" }) };
      await ctx.store.clearTalent(ctx.account.id);
      for (const e of entries) {
        await ctx.store.addTalent(ctx.account.id, { name: e.name ?? (e.handles[0]?.handle ?? "").replace(/^@/, ""), handles: e.handles, interests: [] });
      }
      const say: Out[] = entries.length > 10 ? [C.B2_ROSTER_MANY(entries.length)] : [];
      if (entries.every(e => !e.name)) {
        st.pending = "names";
        return { stay: [...say, C.B2_ROSTER_NAMES(entries.map(e => e.handles[0]?.handle ?? "?"))] };
      }
      if (p.role === "label") { st.pending = "company"; return { stay: [...say, C.B2_COMPANY] }; }
      return { next: "B3", say };
    },
  },

  B2brand: {
    async ask() { return [C.B2_BRAND]; },
    async answer(ctx) {
      const st = ctx.account.state;
      const t = norm(ctx.text);
      const goals = ["product in the shot", "someone from the team as a guest", "a sponsored segment", "not sure yet"];
      let goal = numbersIn(t, 4)[0];
      if (!goal) goal = /placement|in the shot|product/.test(t) ? 1 : /guest|founder|on camera/.test(t) ? 2 : /sponsor|segment|ad read/.test(t) ? 3 : /not sure|idk/.test(t) ? 4 : undefined;
      const p = await profile(ctx);
      if (st.pending !== "goal") {
        p.brandName = ctx.text.replace(/\b[1-4]\b/g, "").replace(/\b(product in the shot|placement|guest|sponsored segment|sponsor|not sure( yet)?)\b/gi, "").replace(/[,.;:\-–]+/g, " ").replace(/\s+/g, " ").trim() || undefined;
      }
      if (goal) p.brandGoal = goals[goal - 1];
      await ctx.store.saveBooker(ctx.account.id, p);
      if (!p.brandName) return { unclear: [C.B2_BRAND], giveUp: async () => ({ next: "B3" }) };
      if (!goal) { st.pending = "goal"; return { stay: [C.B2_BRAND_GOAL] }; }
      return { next: "B3" };
    },
  },

  B3: {
    async ask(ctx) {
      const p = await profile(ctx);
      if (p.role === "brand") return [C.B3_BRAND];
      return [C.B3((await ctx.store.talentFor(ctx.account.id)).length >= 2)];
    },
    async answer(ctx) {
      if (/^(everything|idk|i don'?t know|all|anything|all of it|whatever)$/.test(norm(ctx.text))) {
        return { unclear: [C.B3_UNCLEAR], giveUp: async () => ({ next: "B4" }) };
      }
      await update(ctx, p => { p.nicheText = ctx.text; p.nicheTags = nicheTags(ctx.text); });
      const talent = await ctx.store.talentFor(ctx.account.id);
      const per = talent.length >= 2 ? splitPerArtist(ctx.text, talent) : new Map<string, string>();
      for (const tl of talent) { tl.nicheText = per.get(tl.id) ?? ctx.text; await ctx.store.saveTalent(tl); }
      return { next: "B4" };
    },
  },

  B4: {
    async ask(ctx) { return [C.B4((await profile(ctx)).role)]; },
    optional: { next: "B4b", apply: async ctx => { await update(ctx, p => { p.stopTypes = ["open"]; }); } },
    async answer(ctx) {
      const types = parseStopTypes(ctx.text);
      const release = findRelease(ctx);
      await update(ctx, p => { if (types.length) p.stopTypes = types; if (release) p.upcomingRelease = release; });
      if (!types.length) return { unclear: [C.B4_UNCLEAR], giveUp: async () => ({ next: "B4b" }) };
      return { next: "B4b" };
    },
  },

  B4b: {
    async ask(ctx) {
      const p = await profile(ctx);
      if (p.role === "brand") return [C.B4B("brand", "")];
      const talent = (await ctx.store.talentFor(ctx.account.id)).slice(0, 3);
      if (p.role === "self" || !talent.length) return [C.B4B("self", craft(p.nicheText))];
      const i = ctx.account.state.talentIdx ?? 0;
      const tl = talent[i]!;
      return [i === 0 ? C.B4B(tl.name, craft(tl.nicheText ?? p.nicheText)) : C.B4B_NEXT(tl.name)];
    },
    optional: { next: "B5" },
    async answer(ctx) {
      const st = ctx.account.state;
      const { ids, unknown } = parseInterests(ctx.text, false);
      if (!ids.length && !unknown.length) return { unclear: [C.B4B_UNCLEAR], giveUp: async () => ({ next: "B5" }) };
      if (unknown.length) ctx.account.needsReview.push({ step: "booker:B4b interest", text: unknown.join(", "), at: ctx.now.toISOString() });
      const p = await profile(ctx);
      const talent = (await ctx.store.talentFor(ctx.account.id)).slice(0, 3);
      if (p.role === "brand" || p.role === "self" || !talent.length) {
        p.interests = ids;
        await ctx.store.saveBooker(ctx.account.id, p);
        if (p.role === "self" && talent[0]) { talent[0].interests = ids; await ctx.store.saveTalent(talent[0]); }
        return { next: "B5" };
      }
      const i = st.talentIdx ?? 0;
      talent[i]!.interests = ids;
      await ctx.store.saveTalent(talent[i]!);
      if (i + 1 < talent.length) { st.talentIdx = i + 1; return { next: "B4b" }; }
      st.talentIdx = undefined;
      return { next: "B5" };
    },
  },

  B5: {
    async ask() { return [C.B5]; },
    optional: { next: "B6", apply: async ctx => { await update(ctx, p => { p.budgetText = "depends on the run"; }); } },
    async answer(ctx) {
      const b = parseBudget(ctx.text);
      if (!b) {
        return {
          unclear: [C.B5_UNCLEAR],
          giveUp: async () => { await update(ctx, p => { p.budgetText = ctx.text; }); return { next: "B6" }; },
        };
      }
      await update(ctx, p => { p.budgetLow = b.low; p.budgetHigh = b.high; p.budgetText = b.text; });
      return { next: "B6" };
    },
  },

  B6: {
    async ask() { return [C.B6]; },
    optional: { next: "B7" },
    async answer(ctx) {
      const h = parseHardNos(ctx.text);
      await update(ctx, p => { p.hardNos = h.tags; p.hardNoNotes = h.none ? undefined : ctx.text; });
      return { next: "B7" };
    },
  },

  B7: {
    async ask() { return [C.B7]; },
    async answer(ctx) {
      if (isNyc(ctx.text)) {
        await update(ctx, p => { p.city = "New York"; });
        return { next: "B8", say: [C.B7_NYC] };
      }
      const city = ctx.text.replace(/^(i'?m in|in|based in|from)\s+/i, "").replace(/[.!]+$/, "").trim();
      await update(ctx, p => { p.city = city; p.waitlistCity = city; });
      return { next: "B8", say: [C.B7_ELSEWHERE(city)] };
    },
  },

  B8: {
    async ask(ctx) {
      const p = await profile(ctx);
      const talent = await ctx.store.talentFor(ctx.account.id);
      const lines: string[] = [];
      if (p.role === "brand") lines.push(`Booking for: ${p.brandName ?? "your brand"}${p.brandGoal ? ` (${p.brandGoal})` : ""}`);
      else if (p.role === "self") lines.push(`Booking for: you${p.selfName ? ` (${p.selfName})` : ""}`);
      else lines.push(`Booking for: ${talent.map(tl => tl.nicheText ? `${tl.name} (${tl.nicheText})` : tl.name).join(", ")}${p.company ? ` at ${p.company}` : ""}`);
      if ((p.role === "self" || p.role === "brand") && p.nicheText) lines.push(`Niche: ${p.nicheText}`);
      if (p.stopTypes.length) lines.push(`Looking for: ${p.stopTypes.map(s => STOP_TYPE_LABELS[s]).join(", ")}`);
      const into = p.role === "self" || p.role === "brand"
        ? interestEmojis(p.interests)
        : talent.filter(tl => tl.interests.length).map(tl => `${tl.name.split(" ")[0]} ${interestEmojis(tl.interests)}`).join(" · ");
      if (into) lines.push(`Into: ${into}`);
      if (p.budgetText) lines.push(`Budget: ${p.budgetText}`);
      lines.push(`Never: ${p.hardNoNotes ?? "nothing off-limits"}`);
      const out: Out[] = [C.B8_SUMMARY(first(ctx), lines), C.CONTACT_CARD, C.SAVE_ME];
      if (ctx.account.state.then !== "stop") out.push(C.B8_BOTH);
      return out;
    },
    async auto(ctx) { return ctx.account.state.then === "stop" ? { next: "B9" } : null; },
    async answer(ctx) {
      if (/\blater\b/i.test(ctx.text)) return { next: "B9", say: [C.B8_LATER] };
      if (isYes(ctx.text)) { ctx.account.state.then = "stop"; return { next: "B9" }; }
      return { next: "B9" };
    },
  },

  B9: {
    async ask(ctx) {
      const p = await profile(ctx);
      const out = [...C.B9];
      if (p.upcomingRelease?.date) out.push(C.B9_RELEASE(p.upcomingRelease.text, fmtDate(p.upcomingRelease.date)));
      return out;
    },
    async auto() { return { next: "done" }; },
    async answer() { return { next: "done" }; },
  },
};

