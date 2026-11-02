// Records what Press Run sends and hands it to the iMessage provider. Cards and
// clips carry a `ref` ("card:<stopId>") so a later reaction can be matched to them.
// Once the provider sends a bubble, its id is saved with the logged message, so a
// reply or tapback that names that id finds it.

import type { Store } from "./db/store";
import type { Provider } from "./providers/provider";
import type { Out } from "./types";

/** The logged message id for each bubble object, set by logOut. */
const logIds = new WeakMap<Out, string>();

export async function logOut(store: Store, accountId: string, out: Out[]): Promise<void> {
  for (let i = 0; i < out.length; i++) {
    // Copy each bubble: some are shared constants, and each send needs its own record.
    const o = (out[i] = { ...out[i]! } as Out);
    const row = await store.logMessage({
      accountId, direction: "out", kind: o.type, body: o.type === "text" ? o.text : null,
      providerId: null, data: o.type === "text" ? (o.ref ? { ref: o.ref } : null) : (o as unknown as Record<string, unknown>),
    });
    logIds.set(o, row.id);
  }
}

/** Sends already-logged bubbles and saves the provider's id for each one. */
export async function transmit(store: Store, provider: Provider, phone: string, out: Out[]): Promise<void> {
  if (!out.length) return;
  const ids = await provider.send(phone, out);
  if (!ids) return;
  for (let i = 0; i < out.length; i++) {
    const logId = logIds.get(out[i]!);
    if (logId && ids[i]) await store.setProviderId(logId, ids[i]!);
  }
}
