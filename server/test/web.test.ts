// Slice 5: the website, sign-up, and the admin page.

import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app";
import { Store } from "../src/db/store";
import { testStore } from "./helpers";
import { LocalFiles } from "../src/media/files";
import type { Provider } from "../src/providers/provider";
import type { Out } from "../src/types";

let store: Store;
let app: ReturnType<typeof buildApp>;
let sent: { phone: string; out: Out[] }[];
const provider: Provider = { name: "test", async parseWebhook() { return null; }, async send(phone, out) { sent.push({ phone, out }); } };
const auth = { authorization: `Basic ${btoa("courtney:secret")}` };
const post = (path: string, body: unknown, headers: Record<string, string> = auth) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

beforeEach(async () => {
  store = await testStore();
  sent = [];
  const files = new LocalFiles(await mkdtemp(join(tmpdir(), "pressrun-web-")), "http://test");
  app = buildApp(store, provider, files, { devTools: false, adminPassword: "secret", pressRunNumber: "+15550001234" });
});

describe("website", () => {
  test("the page explains Press Run and carries the number for the button", async () => {
    const r = await app.request("/");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('<button class="btn" id="start" type="button">Start here</button>');
    expect(html).toContain('class="runner"');
    expect(html).toContain('<h1 class="line">Book Your Next Press Run.</h1>');
    expect(html).toContain('const NUMBER = "+15550001234"');
    expect((await app.request("/logo-256.png")).headers.get("content-type")).toContain("image/png");
  });

  test("sign-up returns the code and the pre-typed text", async () => {
    const r = await post("/api/signup", { name: "Dana Cruz", email: "dana@novamgmt.com", intent: "stop" }, {});
    const { data } = await r.json() as { data: { code: string; message: string } };
    expect(data.message).toBe(`Hey Press Run 👋 List my show. Code ${data.code}`);
    expect((await post("/api/signup", { email: "x@y.com" }, {})).status).toBe(400);
  });
});

describe("admin", () => {
  test("needs the password", async () => {
    expect((await app.request("/admin")).status).toBe(401);
    expect((await app.request("/admin", { headers: auth })).status).toBe(200);
  });

  test("take over, text as Press Run, hand back, clear a review item", async () => {
    const a = await store.createAccount("+15550004444", { firstName: "Jay", roles: ["booker"] });
    a.needsReview.push({ step: "booker:B5", text: "depends lol", at: "2026-11-01T12:00:00Z" });
    await store.saveAccount(a);
    const { data } = await (await app.request("/admin/api/overview", { headers: auth })).json() as { data: { review: { text: string }[] } };
    expect(data.review[0]!.text).toBe("depends lol");

    expect((await post("/admin/api/send", { accountId: a.id, text: "Hey Jay, Courtney here" })).status).toBe(409);
    await post("/admin/api/takeover", { accountId: a.id, on: true });
    expect((await store.accountById(a.id))!.needsHuman).toBe(true);
    expect((await post("/admin/api/send", { accountId: a.id, text: "Hey Jay, Courtney here" })).status).toBe(200);
    expect(sent).toEqual([{ phone: "+15550004444", out: [{ type: "text", text: "Hey Jay, Courtney here" }] }]);
    await post("/admin/api/takeover", { accountId: a.id, on: false });
    expect((await store.accountById(a.id))!.needsHuman).toBe(false);

    await post("/admin/api/review/clear", { accountId: a.id, index: 0 });
    expect((await store.accountById(a.id))!.needsReview).toEqual([]);
  });
});
