// The Sendblue line: reading its webhook, sending bubbles, saving message ids so
// tapbacks find their bubble, and tapbacks that arrive as text. Uses a pretend
// Sendblue (no real messages are sent).

import { beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app";
import { Store } from "../src/db/store";
import { parseTextTapback } from "../src/engine/tapback";
import { LocalFiles } from "../src/media/files";
import { e164, parseSendbluePayload, sendblue } from "../src/providers/sendblue";
import { testStore } from "./helpers";

let store: Store;
let calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[];
let n = 0;
const fakeFetch = (async (url: string, init: RequestInit) => {
  calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
  return new Response(JSON.stringify({ status: "QUEUED", message_handle: `sb-${++n}` }), { status: 200 });
}) as unknown as typeof fetch;
const provider = () => sendblue({ SENDBLUE_API_KEY_ID: "key", SENDBLUE_API_SECRET: "secret", SENDBLUE_FROM_NUMBER: "4055687605" }, fakeFetch);

beforeEach(async () => {
  store = await testStore();
  calls = [];
  n = 0;
});

const app = async () => buildApp(store, provider(), new LocalFiles(await mkdtemp(join(tmpdir(), "pressrun-sb-")), "http://test"), { devTools: false, webhookToken: "t0k" });
const hook = async (a: Awaited<ReturnType<typeof app>>, body: Record<string, unknown>, token = "t0k") =>
  a.request(`/webhooks/imessage?token=${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("Sendblue", () => {
  test("phone numbers and webhook bodies", () => {
    expect(e164("4055687605")).toBe("+14055687605");
    expect(e164("+1 (405) 568-7605")).toBe("+14055687605");
    expect(parseSendbluePayload({ content: "hi", from_number: "+15550001111", message_handle: "abc", is_outbound: false, media_url: "" }))
      .toEqual({ phone: "+15550001111", text: "hi", media: undefined, reaction: undefined, providerId: "abc" });
    expect(parseSendbluePayload({ content: "", from_number: "+15550001111", media_url: "https://cdn.sendblue.co/x/IMG_1.MOV" })!.media).toEqual([{ kind: "video", url: "https://cdn.sendblue.co/x/IMG_1.MOV" }]);
    expect(parseSendbluePayload({ content: "sent", from_number: "+15550001111", is_outbound: true })).toBeNull();
    expect(parseSendbluePayload({ content: "hi all", from_number: "+15550001111", group_id: "g1" })).toBeNull();
  });

  test("a text in gets the welcome back through Sendblue, with ids saved", async () => {
    const a = await app();
    expect((await hook(a, { content: "hey", from_number: "+15550001111", message_handle: "in-1" }, "wrong")).status).toBe(403);
    expect((await hook(a, { content: "hey", from_number: "+15550001111", message_handle: "in-1" })).status).toBe(200);
    expect(calls.map(c => c.body)).toEqual([
      { number: "+15550001111", from_number: "+14055687605", content: expect.stringMatching(/^Hey, this is Press Run 👋/) },
      { number: "+15550001111", from_number: "+14055687605", content: expect.stringMatching(/^Are you here to/) },
    ]);
    expect(calls[0]!.url).toBe("https://api.sendblue.co/api/send-message");
    expect(calls[0]!.headers["sb-api-key-id"]).toBe("key");
    const acct = (await store.accountByPhone("+15550001111"))!;
    const out = (await store.messagesFor(acct.id)).filter(m => m.direction === "out");
    expect(out.map(m => m.providerId)).toEqual(["sb-1", "sb-2"]);
    expect((await store.messageById("sb-2"))!.body).toStartWith("Are you here to");
    expect((await store.recentRawWebhooks()).length).toBe(1);
  });

  test("tapbacks that arrive as text", async () => {
    expect(parseTextTapback("Loved “Shortlisted 1 and 3. Want me to ask about dates?”")).toEqual({ emoji: "❤️", removed: false, quoted: "Shortlisted 1 and 3. Want me to ask about dates?", media: undefined });
    expect(parseTextTapback("Liked an image")).toEqual({ emoji: "👍", removed: false, quoted: undefined, media: "image" });
    expect(parseTextTapback("Removed a heart from “Booked ✅”")!.removed).toBe(true);
    expect(parseTextTapback("Loved it, see you Thursday")).toBeNull();
    expect(parseTextTapback("Questioned a movie")!.emoji).toBe("❓");
  });
});
