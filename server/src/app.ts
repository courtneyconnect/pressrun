// HTTP routes. In production only /health, the webhook and the sign-up API are
// exposed; the /dev tools are on when DEV_TOOLS=1.

import { Hono } from "hono";
import type { Store } from "./db/store";
import { Engine } from "./engine/engine";
import type { Provider } from "./providers/provider";
import type { Inbound } from "./types";
import { phonePage } from "./dev/phone-page";

export function buildApp(store: Store, provider: Provider, opts: { devTools: boolean; jobSecret?: string; clock?: () => Date }) {
  const engine = new Engine(store, opts.clock);
  const app = new Hono();

  app.get("/health", c => c.json({ data: { ok: true, provider: provider.name } }));

  // Website sign-up: returns the code the Text Press Run button types for them.
  app.post("/api/signup", async c => {
    const body = await c.req.json<{ name?: string; email?: string; intent?: string }>().catch(() => ({} as Record<string, string>));
    const intent = body.intent === "stop" || body.intent === "both" ? body.intent : "booker";
    if (!body.name?.trim()) return c.json({ error: { message: "Name is required", code: "name_required" } }, 400);
    const code = await store.createSignupCode({ name: body.name.trim(), email: body.email?.trim(), intent });
    const message = intent === "stop" ? `Hey Press Run 👋 List my show. Code ${code.code}` : `Hey Press Run 👋 Sign me up. Code ${code.code}`;
    return c.json({ data: { code: code.code, message } });
  });

  // The iMessage provider's webhook.
  app.post("/webhooks/imessage", async c => {
    const inbound = await provider.parseWebhook(c.req.raw);
    for (const msg of inbound ?? []) await provider.send(msg.phone, await engine.handle(msg));
    return c.body(null, 204);
  });

  // Hourly job: 24h and 72h nudges.
  app.post("/jobs/nudges", async c => {
    if (!opts.jobSecret || c.req.header("x-job-secret") !== opts.jobSecret) return c.json({ error: { message: "Forbidden", code: "forbidden" } }, 403);
    const sent = await engine.nudges();
    for (const s of sent) await provider.send(s.phone, s.out);
    return c.json({ data: { sent: sent.length } });
  });

  if (opts.devTools) {
    app.get("/dev/phone", c => c.html(phonePage));
    app.post("/dev/inbound", async c => {
      const msg = await c.req.json<Inbound>();
      const out = await engine.handle(msg);
      await provider.send(msg.phone, out);
      return c.json({ data: out });
    });
    app.get("/dev/thread", async c => {
      const account = await store.accountByPhone(c.req.query("phone") ?? "");
      if (!account) return c.json({ data: { account: null, messages: [] } });
      return c.json({ data: { account, messages: await store.messagesFor(account.id), booker: await store.booker(account.id), talent: await store.talentFor(account.id), stops: await store.stopsByOwner(account.id) } });
    });
  }
  return app;
}
