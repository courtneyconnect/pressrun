// Numbering matches and deciding how to send them: cards and clips for 5 or
// fewer, one master list image for more.

import type { Store } from "../db/store";
import type { Account, BookerProfile, Out, RunOption, RunRequest, Talent } from "../types";
import * as C from "../engine/copy";
import { describeRequest, matchStops, type Match } from "./match";

export const CARDS_AT_ONCE = 5;
export const LIST_ROWS = 20;

export async function bookerContext(store: Store, accountId: string): Promise<{ profile: BookerProfile; talent: Talent[] }> {
  return { profile: await store.booker(accountId), talent: await store.talentFor(accountId) };
}

/** Matches for this request, leaving out Press Stops it already numbered (unless `includeExisting`). */
export async function findMatches(store: Store, req: RunRequest, now: Date, extra: Partial<RunRequest["only"]> = {}, includeExisting = false): Promise<Match[]> {
  const { profile, talent } = await bookerContext(store, req.bookerId);
  const all = matchStops(await store.liveStops(), { ...req, only: { ...req.only, ...extra } }, profile, talent, now);
  const known = new Set(req.options.filter(o => !includeExisting || o.state === "dropped").map(o => o.stopId));
  return all.filter(m => !known.has(m.stop.id));
}

/** Gives each match the next number (reusing the number a Press Stop already has). */
export function assign(req: RunRequest, matches: Match[], state: RunOption["state"]): RunOption[] {
  return matches.map(m => {
    const existing = req.options.find(o => o.stopId === m.stop.id && o.state !== "dropped");
    if (existing) return existing;
    const opt: RunOption = { number: req.nextNumber++, stopId: m.stop.id, state, score: m.score, why: m.why };
    req.options.push(opt);
    return opt;
  });
}

/** Sends a set of options: cards for 5 or fewer, the master list for more. */
export async function sendSet(store: Store, req: RunRequest, opts: RunOption[], now: Date, intro: Out[], outro: "summary" | "none"): Promise<void> {
  if (opts.length > CARDS_AT_ONCE) {
    req.mode = "list";
    req.cursor = 0;
    for (const o of opts) if (o.state === "sent") continue; else o.state = "listed";
    await store.saveRequest(req);
    await store.enqueue("send_list", { requestId: req.id, numbers: opts.map(o => o.number), intro }, now);
    return;
  }
  for (const o of opts) if (o.state === "listed") o.state = "sent";
  req.mode ??= "cards";
  await store.saveRequest(req);
  await store.enqueue("send_options", { requestId: req.id, numbers: opts.map(o => o.number), intro, outro }, now);
}

/** R2: the request is complete. Confirm it and start sending options. */
export async function launch(store: Store, account: Account, req: RunRequest, now: Date): Promise<Out[]> {
  const { talent } = await bookerContext(store, account.id);
  req.status = "open";
  const matches = await findMatches(store, req, now);
  const opts = assign(req, matches.slice(0, 40), matches.length > CARDS_AT_ONCE ? "listed" : "sent");
  await sendSet(store, req, opts, now, [], "summary");
  const say: Out[] = [];
  if (req.usualBudget && req.budgetText) say.push(C.R_USING_BUDGET(req.budgetText));
  say.push(C.R_ON_IT(describeRequest(req, talent)));
  return say;
}
