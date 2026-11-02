// The iMessage line. Each provider turns its webhook into Inbound messages and
// sends Press Run's bubbles. The simulator stands in until the real line exists.

import type { Inbound, Out } from "../types";

export interface Provider {
  name: string;
  /** Reads a webhook request. Returns null if it isn't a message we handle. */
  parseWebhook(req: Request): Promise<Inbound[] | null>;
  /** Sends the bubbles in order. May return the provider's id for each bubble (for matching replies and tapbacks). */
  send(phone: string, out: Out[]): Promise<(string | undefined)[] | void>;
}

/** Local testing: replies are stored in the database and shown on /dev/phone. */
export const simulator: Provider = {
  name: "simulator",
  async parseWebhook() { return null; },
  async send() {},
};

/**
 * Linq (recommended in the build plan). Its docs describe `reaction.added` /
 * `reaction.removed` events naming the reacted-to message and signed webhooks.
 * This adapter gets written against the live docs once the free trial gives us
 * API access: the docs site is blocked from this build environment, and the
 * request shapes must not be guessed.
 */
export const linq: Provider = {
  name: "linq",
  async parseWebhook() { throw new Error("Linq adapter not built yet: needs trial API access and the live docs."); },
  async send() { throw new Error("Linq adapter not built yet: needs trial API access and the live docs."); },
};
