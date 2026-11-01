// The conversation engine. Every inbound text goes through `handle`, which
// applies the global rules from section 0 of the booker script (STOP, HELP,
// human, back, skip, start over, voice notes, mid-flow questions), then hands
// the reply to the current step of the current flow.

import type { Store } from "../db/store";
import type { Account, Flow, Inbound, Out } from "../types";
import { logOut } from "../outbox";
import * as C from "./copy";
import { norm } from "./parse";
import { bookerSteps, BOOKER_FIRST } from "./flows/booker";
import { stopSteps, STOP_FIRST } from "./flows/stop";
import { runSteps, RUN_FIRST } from "./flows/run";
import { handleBooker } from "../run/picking";

export interface Ctx {
  store: Store;
  account: Account;
  input: Inbound;
  text: string;
  now: Date;
}

/** What a step decides after reading a reply. `next` may be "flow:step" to switch flows, or "done". */
export type Result =
  | { next: string; say?: Out[] }
  | { stay: Out[] }
  | { unclear: Out[]; giveUp: () => Promise<{ next: string; say?: Out[] }> };

export interface Step {
  ask(ctx: Ctx): Promise<Out[]>;
  answer(ctx: Ctx): Promise<Result>;
  /** Skippable: where "skip" goes, and what it saves. */
  optional?: { next: string; apply?: (ctx: Ctx) => Promise<void> };
  /** Steps that move on by themselves after asking (return null to wait for a reply). */
  auto?: (ctx: Ctx) => Promise<{ next: string; say?: Out[] } | null>;
  /** Accepts photos/videos as an answer (otherwise media gets "Got it 👍"). */
  takesMedia?: boolean;
  /** Reads tapbacks itself (otherwise 👍/❤️ on a question counts as "yes"). */
  takesReactions?: boolean;
}

const FLOWS: Record<Flow, { steps: Record<string, Step>; first: string }> = {
  booker: { steps: bookerSteps, first: BOOKER_FIRST },
  stop: { steps: stopSteps, first: STOP_FIRST },
  run: { steps: runSteps, first: RUN_FIRST },
};

const SIGNUP_CODE = /\bPR-[A-Z2-9]{4}\b/i;

export class Engine {
  constructor(private store: Store, private clock: () => Date = () => new Date()) {}

  /** Handles one inbound message and returns the bubbles to send back (already logged). */
  async handle(input: Inbound): Promise<Out[]> {
    const now = this.clock();
    let account = await this.store.accountByPhone(input.phone);
    const isNew = !account;
    if (!account) account = await this.store.createAccount(input.phone);
    account.lastInboundAt = now.toISOString();
    account.state.nudges = 0;
    await this.store.logMessage({
      accountId: account.id, direction: "in", kind: input.reaction ? "reaction" : input.media?.length ? "media" : "text",
      body: input.text, providerId: input.providerId ?? null,
      data: input.reaction || input.media ? { reaction: input.reaction, media: input.media } : null,
    });

    const ctx: Ctx = { store: this.store, account, input, text: input.text.trim(), now };
    const out = await this.route(ctx, isNew);
    await this.store.saveAccount(ctx.account);
    await logOut(this.store, account.id, out);
    return out;
  }

  private async route(ctx: Ctx, isNew: boolean): Promise<Out[]> {
    const a = ctx.account;
    const t = norm(ctx.text);

    if (/^(stop|stopall|unsubscribe|quit|cancel|end)$/.test(t)) {
      a.optedOut = true;
      return [C.UNSUBSCRIBED];
    }
    if (a.optedOut) {
      if (/^(start|unstop|yes)$/.test(t)) {
        a.optedOut = false;
        return [C.RESUBSCRIBED, ...(await this.askCurrent(ctx))];
      }
      return [];
    }
    if (a.needsHuman) return []; // Courtney has the thread; she hands it back from the admin page.
    if (/^(human|real person|talk to (someone|a person|a human)|agent|courtney)$/.test(t)) {
      a.needsHuman = true;
      return [C.HUMAN];
    }

    if (isNew) return this.entry(ctx);
    if (!a.flow) return this.afterOnboarding(ctx);

    const step = this.currentStep(a);
    if (!step) return this.afterOnboarding(ctx);

    if (/^(help|\?)$/.test(t)) return [C.HELP, ...(await step.ask(ctx))];
    if (t === "start over" || t === "restart") return this.startOver(ctx);
    if (t === "back") {
      const prev = a.state.history.pop();
      if (prev) a.step = prev;
      return this.askCurrent(ctx);
    }
    if (/^skip$/.test(t)) {
      if (!step.optional) return [C.NEED_THIS];
      await step.optional.apply?.(ctx);
      return this.goTo(ctx, step.optional.next, []);
    }
    if (ctx.input.media?.some(m => m.kind === "audio")) return [C.VOICE_NOTE];
    if (!ctx.text && ctx.input.media?.length && !step.takesMedia) return [C.GOT_IT, ...(await step.ask(ctx))];
    if (ctx.input.reaction && !step.takesReactions) {
      // A tapback on a question: counts as "yes" only where the step reads yes/no.
      const emo = ctx.input.reaction.emoji;
      if (ctx.input.reaction.removed || !["👍", "❤️", "❤"].includes(emo)) return [];
      ctx.text = "yes";
    }
    const faq = ctx.text.endsWith("?") ? C.FAQ.find(f => f.match.test(ctx.text)) : undefined;
    if (faq) return [C.t(faq.answer), C.BACK_TO_IT, ...(await step.ask(ctx))];

    return this.apply(ctx, step, await step.answer(ctx));
  }

  private async apply(ctx: Ctx, step: Step, r: Result): Promise<Out[]> {
    const a = ctx.account;
    if ("stay" in r) return r.stay;
    if ("next" in r) return this.goTo(ctx, r.next, r.say ?? []);
    // Unclear: ask once more with examples, then save it as written and move on.
    const key = `${a.flow}:${a.step}:${a.state.talentIdx ?? ""}`;
    const tries = a.state.retries[key] ?? 0;
    if (tries < 1) {
      a.state.retries[key] = tries + 1;
      return r.unclear;
    }
    a.needsReview.push({ step: `${a.flow}:${a.step}`, text: ctx.text, at: ctx.now.toISOString() });
    const g = await r.giveUp();
    return this.goTo(ctx, g.next, g.say ?? []);
  }

  /** Moves to a step (or flow), sends its question, and runs any steps that move on by themselves. */
  private async goTo(ctx: Ctx, next: string, say: Out[]): Promise<Out[]> {
    const a = ctx.account;
    const out = [...say];
    let target = next;
    for (let guard = 0; guard < 20; guard++) {
      if (target === "done") {
        a.state.history = [];
        const then = a.state.then;
        a.state.then = null;
        if (then) { target = `${then}:${FLOWS[then].first}`; continue; }
        a.flow = null;
        a.step = null;
        return out;
      }
      const [flowPart, stepPart] = target.includes(":") ? target.split(":") as [Flow, string] : [a.flow!, target];
      if (a.flow && a.step && !(a.flow === flowPart && a.step === stepPart)) a.state.history.push(a.step);
      if (a.flow !== flowPart) a.state.history = [];
      a.state.pending = null;
      a.state.asked = [];
      a.flow = flowPart;
      a.step = stepPart;
      const step = this.currentStep(a)!;
      out.push(...(await step.ask(ctx)));
      if (!step.auto) return out;
      const r = await step.auto(ctx);
      if (!r) return out;
      out.push(...(r.say ?? []));
      target = r.next;
    }
    throw new Error("Flow loop: too many automatic steps");
  }

  private currentStep(a: Account): Step | undefined {
    return a.flow && a.step ? FLOWS[a.flow].steps[a.step] : undefined;
  }

  private async askCurrent(ctx: Ctx): Promise<Out[]> {
    const step = this.currentStep(ctx.account);
    return step ? step.ask(ctx) : [];
  }

  private async startOver(ctx: Ctx): Promise<Out[]> {
    const a = ctx.account;
    const flow = a.flow!;
    a.state = { retries: {}, history: [], then: a.state.then, stopId: flow === "stop" ? undefined : a.state.stopId };
    if (flow === "booker") {
      await ctx.store.saveBooker(a.id, { extraRoles: [], handles: [], nicheTags: [], stopTypes: [], hardNos: [], interests: [] });
      await ctx.store.clearTalent(a.id);
    }
    a.step = null;
    return [C.STARTING_OVER, ...(await this.goTo(ctx, `${flow}:${a.firstName ? FLOWS[flow].first : flow === "booker" ? "B0" : "S0a"}`, []))];
  }

  /** First message from a new phone number. */
  private async entry(ctx: Ctx): Promise<Out[]> {
    const a = ctx.account;
    const codeText = ctx.text.match(SIGNUP_CODE)?.[0];
    const code = codeText ? await ctx.store.signupCode(codeText) : null;
    if (code && !code.claimedBy) {
      await ctx.store.claimSignupCode(code.code, a.id);
      a.firstName = code.name?.split(" ")[0];
      a.email = code.email;
      if (code.intent === "stop") return this.goTo(ctx, `stop:${STOP_FIRST}`, []);
      if (code.intent === "both") a.state.then = "stop";
      return this.goTo(ctx, `booker:${BOOKER_FIRST}`, []);
    }
    a.flow = "booker";
    return this.goTo(ctx, "booker:B0", []);
  }

  /** Someone who finished onboarding: new shows, run requests and picking options. */
  private async afterOnboarding(ctx: Ctx): Promise<Out[]> {
    const t = norm(ctx.text);
    if (/\b(list my show|add another show|add (a )?show|list (a|my) series)\b/.test(t)) {
      ctx.account.state.stopId = undefined;
      return this.goTo(ctx, `stop:${STOP_FIRST}`, []);
    }
    const r = await handleBooker(ctx, (target, say) => this.goTo(ctx, target, say));
    if (r) return r;
    return ctx.input.reaction ? [] : [C.WELCOME_BACK(ctx.account.firstName)];
  }

  /** Sends the 24-hour and 72-hour nudges to people who went quiet mid-onboarding. Run hourly. */
  async nudges(): Promise<{ phone: string; out: Out[] }[]> {
    const now = this.clock().getTime();
    const sent: { phone: string; out: Out[] }[] = [];
    for (const a of await this.store.listAccounts()) {
      if (!a.flow || a.optedOut || a.needsHuman || !a.lastInboundAt) continue;
      const hours = (now - Date.parse(a.lastInboundAt)) / 36e5;
      const n = a.state.nudges ?? 0;
      const msg = n === 0 && hours >= 24 ? C.NUDGE_24 : n === 1 && hours >= 72 ? C.NUDGE_72 : null;
      if (!msg) continue;
      a.state.nudges = n + 1;
      await this.store.saveAccount(a);
      await logOut(this.store, a.id, [msg]);
      sent.push({ phone: a.phone, out: [msg] });
    }
    return sent;
  }
}
