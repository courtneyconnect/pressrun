// HTTP routes. In production only /health, the webhook and the sign-up API are
// exposed; the /dev tools are on when DEV_TOOLS=1.

import { Hono } from "hono";
import type { Store } from "./db/store";
import { Engine } from "./engine/engine";
import type { Provider } from "./providers/provider";
import type { Inbound } from "./types";
import { phonePage } from "./dev/phone-page";
import { transmit } from "./outbox";
import { LocalFiles, type FileStore } from "./media/files";
import { landingPage } from "./web/landing";
import { adminRoutes } from "./web/admin";

export function buildApp(store: Store, provider: Provider, files: FileStore, opts: { devTools: boolean; jobSecret?: string; clock?: () => Date; adminPassword?: string; pressRunNumber?: string; webhookToken?: string }) {
  const engine = new Engine(store, opts.clock, (a, out) => transmit(store, provider, a.phone, out));
  const app = new Hono();

  app.get("/health", c => c.json({ data: { ok: true, provider: provider.name } }));

  // The website: one page that explains Press Run and ends in the Text Press Run button.
  app.get("/", c => c.html(landingPage({ number: opts.pressRunNumber })));
  for (const name of ["logo-256.png", "apple-touch-icon.png"]) {
    app.get(`/${name}`, () => new Response(Bun.file(new URL(`../public/${name}`, import.meta.url)), { headers: { "cache-control": "public, max-age=86400" } }));
  }

  // Courtney's admin page. Off unless ADMIN_PASSWORD is set.
  if (opts.adminPassword) app.route("/admin", adminRoutes(store, provider, opts.adminPassword, opts.clock));

  // Cards and clips when stored locally (production uses R2's public URL instead).
  if (files instanceof LocalFiles) {
    app.get("/files/*", async c => {
      const f = files.file(c.req.path.slice("/files/".length));
      return f && (await f.exists()) ? new Response(f) : c.notFound();
    });
  }

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
    if (opts.webhookToken && c.req.query("token") !== opts.webhookToken) return c.json({ error: { message: "Forbidden", code: "forbidden" } }, 403);
    const raw = await c.req.text();
    await store.saveRawWebhook(provider.name, raw);
    const inbound = await provider.parseWebhook(new Request(c.req.url, { method: "POST", headers: c.req.raw.headers, body: raw }));
    for (const msg of inbound ?? []) await transmit(store, provider, msg.phone, await engine.handle(msg));
    return c.json({ data: { ok: true } });
  });

  // Hourly job: 24h and 72h nudges.
  app.post("/jobs/nudges", async c => {
    if (!opts.jobSecret || c.req.header("x-job-secret") !== opts.jobSecret) return c.json({ error: { message: "Forbidden", code: "forbidden" } }, 403);
    const sent = await engine.nudges();
    for (const s of sent) await transmit(store, provider, s.phone, s.out);
    return c.json({ data: { sent: sent.length } });
  });

  if (opts.devTools) {
    app.get("/dev/phone", c => c.html(phonePage));
    app.post("/dev/inbound", async c => {
      const msg = await c.req.json<Inbound>();
      // The test phone's "react to last" button: point at the newest card or clip.
      if (msg.reaction?.targetProviderId === "last") {
        const account = await store.accountByPhone(msg.phone);
        const last = account ? (await store.messagesFor(account.id)).filter(m => m.direction === "out" && (m.kind === "image" || m.kind === "video")).pop() : undefined;
        msg.reaction.targetProviderId = last?.id ?? "none";
      }
      const out = await engine.handle(msg);
      await transmit(store, provider, msg.phone, out);
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
