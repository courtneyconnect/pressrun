// Records what Press Run sends and hands it to the iMessage provider. Cards and
// clips carry a `ref` ("card:<stopId>") so a later reaction can be matched to them.

import type { Store } from "./db/store";
import type { Out } from "./types";

export async function logOut(store: Store, accountId: string, out: Out[]): Promise<void> {
  for (const o of out) {
    await store.logMessage({
      accountId, direction: "out", kind: o.type, body: o.type === "text" ? o.text : null,
      providerId: null, data: o.type === "text" ? (o.ref ? { ref: o.ref } : null) : (o as unknown as Record<string, unknown>),
    });
  }
}
