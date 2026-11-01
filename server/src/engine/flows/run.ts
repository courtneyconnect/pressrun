// A run request missing a piece: asks for that one thing only (booker script R1).

import type { Ctx, Step } from "../engine";
import * as C from "../copy";
import { fmtDate, isNo, isNyc, isYes, norm, parseDates, parseRelativeWindow } from "../parse";
import { andList } from "../../run/match";
import { bookerContext, launch } from "../../run/options";

async function req(ctx: Ctx) {
  return ctx.account.state.requestId ? ctx.store.request(ctx.account.state.requestId) : null;
}

export const RUN_FIRST = "Rcheck";

export const runSteps: Record<string, Step> = {
  // Decides what's still missing, or launches the request.
  Rcheck: {
    async ask() { return []; },
    async auto(ctx) {
      const r = await req(ctx);
      if (!r) return { next: "done" };
      if (r.city && r.city !== "New York") return { next: "Rcity" };
      if (!r.city) {
        const { profile } = await bookerContext(ctx.store, ctx.account.id);
        if (profile.city === "New York") r.city = "New York"; else { await ctx.store.saveRequest(r); return { next: "Rcity" }; }
      }
      if (!r.start) { await ctx.store.saveRequest(r); return { next: "Rdates" }; }
      if (r.needWho) { await ctx.store.saveRequest(r); return { next: "Rwho" }; }
      return { next: "done", say: await launch(ctx.store, ctx.account, r, ctx.now) };
    },
    async answer() { return { next: "Rcheck" }; },
  },

  Rdates: {
    async ask(ctx) {
      const r = await req(ctx);
      return [r?.pastDate ? C.R_PAST(fmtDate(r.pastDate)) : C.R_DATES];
    },
    async answer(ctx) {
      const r = (await req(ctx))!;
      const d = parseDates(ctx.text, ctx.now);
      const w = d.dates.length ? { start: d.dates[0]!, end: d.dates[d.dates.length - 1]! } : parseRelativeWindow(ctx.text, ctx.now);
      if (!w) {
        if (d.past.length) { r.pastDate = d.past[0]; await ctx.store.saveRequest(r); return { stay: [C.R_PAST(fmtDate(d.past[0]!))] }; }
        return { unclear: [C.R_DATES], giveUp: async () => { r.status = "closed"; await ctx.store.saveRequest(r); return { next: "done", say: [C.R_DATES_LATER] }; } };
      }
      r.start = w.start; r.end = w.end; r.pastDate = undefined;
      await ctx.store.saveRequest(r);
      return { next: "Rcheck" };
    },
  },

  Rcity: {
    async ask(ctx) {
      const r = await req(ctx);
      return [r?.city && r.city !== "New York" ? C.R_CITY_NOT_LIVE(r.city) : C.R_CITY];
    },
    async answer(ctx) {
      const r = (await req(ctx))!;
      if (isNyc(ctx.text) || isYes(ctx.text)) { r.city = "New York"; await ctx.store.saveRequest(r); return { next: "Rcheck" }; }
      if (isNo(ctx.text) || r.city) {
        const city = r.city ?? ctx.text.trim();
        r.status = "closed";
        await ctx.store.saveRequest(r);
        return { next: "done", say: [C.R_CITY_LATER(city)] };
      }
      r.city = ctx.text.trim();
      await ctx.store.saveRequest(r);
      return { next: "Rcity" };
    },
  },

  Rwho: {
    async ask(ctx) {
      const { talent } = await bookerContext(ctx.store, ctx.account.id);
      return [C.R_WHO(andList(talent.map(t => t.name)).replace(/ and ([^,]+)$/, ", $1"))];
    },
    async answer(ctx) {
      const r = (await req(ctx))!;
      const { talent } = await bookerContext(ctx.store, ctx.account.id);
      const t = norm(ctx.text);
      const named = talent.filter(tl => t.includes(norm(tl.name.split(" ")[0]!)));
      const ids = /\b(all|both|everyone)\b/.test(t) ? talent.map(tl => tl.id) : named.map(tl => tl.id);
      if (!ids.length) return { unclear: [C.R_WHO(talent.map(tl => tl.name).join(", "))], giveUp: async () => { r.talentIds = talent.map(tl => tl.id); r.needWho = false; await ctx.store.saveRequest(r); return { next: "Rcheck" }; } };
      r.talentIds = ids; r.needWho = false;
      await ctx.store.saveRequest(r);
      return { next: "Rcheck" };
    },
  },
};
