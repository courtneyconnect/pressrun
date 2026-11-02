// Sendblue: the iMessage line for testing while Linq's waitlist clears.
//
// Built from Sendblue's documented API (their docs site is blocked from the
// build environment, so these come from the docs as quoted in search results):
// - Sending: POST {base}/api/send-message with headers `sb-api-key-id` and
//   `sb-api-secret-key`, JSON body `number`, `content`, `media_url`, and
//   `from_number` (the Sendblue line). A 200 means accepted, not delivered.
// - Receiving: Sendblue POSTs JSON to our webhook with `content`, `media_url`,
//   `is_outbound`, `status`, `message_handle`, `from_number`, `number`,
//   `to_number`, `service` and `group_id`. The endpoint must answer 2xx.
// Not documented anywhere we could read: how an incoming tapback (❤️ on a card)
// arrives. Every webhook body is saved (admin → /admin/api/webhooks), and the
// engine also understands tapbacks sent as text ("Loved “…”"). Check the
// first live ❤️ against the saved bodies and adjust `readReaction` below.

import type { Inbound, Out } from "../types";
import type { Provider } from "./provider";

export interface SendblueConfig {
  SENDBLUE_API_KEY_ID?: string;
  SENDBLUE_API_SECRET?: string;
  SENDBLUE_FROM_NUMBER?: string;
  /** Defaults to https://api.sendblue.co. Use the base URL shown in the dashboard's examples if it differs. */
  SENDBLUE_API_BASE?: string;
}

const kindOf = (url: string): "image" | "video" | "audio" | "other" =>
  /\.(jpe?g|png|gif|heic|webp)(\?|$)/i.test(url) ? "image"
    : /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) ? "video"
      : /\.(m4a|caf|mp3|aac|amr|wav)(\?|$)/i.test(url) ? "audio" : "other";

/** "+1 (405) 568-7605" → "+14055687605" */
export const e164 = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, "");
  return d.startsWith("+") ? d : d.length === 10 ? `+1${d}` : `+${d}`;
};

type Payload = Record<string, unknown>;

/** A tapback in the webhook body, if Sendblue sends one as its own field. Shapes are guesses until the first live test. */
function readReaction(p: Payload): Inbound["reaction"] | undefined {
  const r = (p.reaction ?? p.tapback) as Payload | string | undefined;
  const target = String(p.associated_message_handle ?? p.reacted_to_message_handle ?? (typeof r === "object" ? r?.message_handle : "") ?? "");
  const kind = String(typeof r === "object" ? r?.type ?? r?.reaction ?? "" : r ?? "").toLowerCase();
  if (!kind || !target) return undefined;
  const emoji: Record<string, string> = { love: "❤️", loved: "❤️", heart: "❤️", like: "👍", liked: "👍", dislike: "👎", disliked: "👎", laugh: "😂", emphasize: "‼️", question: "❓", questioned: "❓" };
  return { emoji: emoji[kind] ?? kind, targetProviderId: target, removed: /remove/.test(String(p.reaction_action ?? "")) };
}

export function parseSendbluePayload(p: Payload): Inbound | null {
  if (p.is_outbound === true || p.is_outbound === "true") return null; // our own messages and status updates
  if (p.group_id) return null; // group chats aren't part of Press Run
  const phone = String(p.from_number ?? p.number ?? "");
  if (!phone) return null;
  const mediaUrl = typeof p.media_url === "string" && p.media_url ? p.media_url : undefined;
  return {
    phone: e164(phone),
    text: typeof p.content === "string" ? p.content : "",
    media: mediaUrl ? [{ kind: kindOf(mediaUrl), url: mediaUrl }] : undefined,
    reaction: readReaction(p),
    providerId: typeof p.message_handle === "string" ? p.message_handle : undefined,
  };
}

/** One Sendblue request per bubble: text as content, pictures/clips/calendar files as media_url, links as text so they preview. */
function bodyFor(o: Out): { content?: string; media_url?: string } | null {
  switch (o.type) {
    case "text": return { content: o.text };
    case "link": return { content: o.url };
    case "image": case "video": case "file": return { media_url: o.url };
    case "contact": return null; // the contact card comes later (a .vcf file)
  }
}

export function sendblue(env: SendblueConfig, fetcher: typeof fetch = fetch): Provider {
  const base = (env.SENDBLUE_API_BASE ?? "https://api.sendblue.co").replace(/\/$/, "");
  const headers = { "content-type": "application/json", "sb-api-key-id": env.SENDBLUE_API_KEY_ID ?? "", "sb-api-secret-key": env.SENDBLUE_API_SECRET ?? "" };
  return {
    name: "sendblue",
    async parseWebhook(req) {
      const body = (await req.json().catch(() => null)) as Payload | null;
      if (!body) return null;
      const msg = parseSendbluePayload(body);
      return msg ? [msg] : [];
    },
    async send(phone, out) {
      if (!env.SENDBLUE_API_KEY_ID || !env.SENDBLUE_API_SECRET) throw new Error("Sendblue keys are missing (SENDBLUE_API_KEY_ID, SENDBLUE_API_SECRET).");
      const ids: (string | undefined)[] = [];
      for (const o of out) {
        const b = bodyFor(o);
        if (!b) { ids.push(undefined); continue; }
        const res = await fetcher(`${base}/api/send-message`, {
          method: "POST", headers,
          body: JSON.stringify({ number: e164(phone), ...(env.SENDBLUE_FROM_NUMBER ? { from_number: e164(env.SENDBLUE_FROM_NUMBER) } : {}), ...b }),
        });
        const json = (await res.json().catch(() => ({}))) as Payload;
        if (!res.ok) throw new Error(`Sendblue send failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
        ids.push(typeof json.message_handle === "string" ? json.message_handle : undefined);
      }
      return ids;
    },
  };
}
