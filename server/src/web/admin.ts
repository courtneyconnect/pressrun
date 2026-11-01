// Courtney's admin page (/admin): threads that need a person, replies saved
// for review, live conversations, and the controls to take a thread over,
// text as Press Run, hand it back, and type in view counts from screenshots.
// Protected by ADMIN_PASSWORD (HTTP basic auth). Off when it isn't set.

import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import type { Store } from "../db/store";
import { logOut } from "../outbox";
import type { Provider } from "../providers/provider";
import { maybeRecap } from "../run/followup";
import { bookerLabel, stopLabel } from "../run/relay";

export function adminRoutes(store: Store, provider: Provider, password: string, clock: () => Date = () => new Date()) {
  const app = new Hono();
  app.use("*", basicAuth({ username: "courtney", password }));

  app.get("/", c => c.html(adminPage));

  app.get("/api/overview", async c => {
    const accounts = await store.listAccounts();
    const who = (a: (typeof accounts)[number]) => ({ id: a.id, name: a.firstName ?? "(no name yet)", phone: a.phone, memberNo: a.memberNo, roles: a.roles, step: a.flow ? `${a.flow}:${a.step}` : null, lastInboundAt: a.lastInboundAt });
    const convs = await store.recentConversations(100);
    return c.json({ data: {
      takenOver: accounts.filter(a => a.needsHuman).map(who),
      review: accounts.flatMap(a => a.needsReview.map((r, i) => ({ ...r, index: i, account: who(a) }))).sort((x, y) => y.at.localeCompare(x.at)),
      conversations: await Promise.all(convs.map(async v => ({
        id: v.id, code: v.code, status: v.status, booker: await bookerLabel(store, v), stop: await stopLabel(store, v),
        bookerId: v.bookerId, contactId: v.contactId, proposal: v.proposal, shootAt: v.shootAt, post: v.post, rating: v.rating,
      }))),
      counts: { accounts: accounts.length, bookers: accounts.filter(a => a.roles.includes("booker")).length, stops: (await store.allStops()).filter(s => s.status === "live").length },
    } });
  });

  app.get("/api/thread", async c => {
    const a = await store.accountById(c.req.query("accountId") ?? "");
    if (!a) return c.json({ error: { message: "Not found", code: "not_found" } }, 404);
    return c.json({ data: { account: a, messages: await store.messagesFor(a.id, 1000) } });
  });

  // Take a thread over (the bot goes quiet) or hand it back.
  app.post("/api/takeover", async c => {
    const { accountId, on } = await c.req.json<{ accountId: string; on: boolean }>();
    const a = await store.accountById(accountId);
    if (!a) return c.json({ error: { message: "Not found", code: "not_found" } }, 404);
    a.needsHuman = !!on;
    await store.saveAccount(a);
    return c.json({ data: { needsHuman: a.needsHuman } });
  });

  // Text someone as Press Run. Only from a thread that's taken over, so the bot and Courtney don't talk over each other.
  app.post("/api/send", async c => {
    const { accountId, text } = await c.req.json<{ accountId: string; text: string }>();
    const a = await store.accountById(accountId);
    if (!a || !text?.trim()) return c.json({ error: { message: "Account and text are required", code: "bad_request" } }, 400);
    if (!a.needsHuman) return c.json({ error: { message: "Take the thread over first", code: "not_taken_over" } }, 409);
    if (a.optedOut) return c.json({ error: { message: "This person replied STOP", code: "opted_out" } }, 409);
    const out = [{ type: "text" as const, text: text.trim() }];
    await logOut(store, a.id, out);
    await provider.send(a.phone, out);
    return c.json({ data: { sent: true } });
  });

  app.post("/api/review/clear", async c => {
    const { accountId, index } = await c.req.json<{ accountId: string; index: number }>();
    const a = await store.accountById(accountId);
    if (!a) return c.json({ error: { message: "Not found", code: "not_found" } }, 404);
    a.needsReview.splice(index, 1);
    await store.saveAccount(a);
    return c.json({ data: { left: a.needsReview.length } });
  });

  // View counts read from an Instagram insights screenshot.
  app.post("/api/views", async c => {
    const { convId, views } = await c.req.json<{ convId: string; views: number }>();
    const conv = await store.conversation(convId);
    if (!conv?.post || !(views >= 0)) return c.json({ error: { message: "Conversation and views are required", code: "bad_request" } }, 400);
    conv.post.views = Math.round(views);
    await store.saveConversation(conv);
    const req = await store.request(conv.requestId);
    if (req) await maybeRecap({ store, now: clock() }, req);
    return c.json({ data: { views: conv.post.views } });
  });

  return app;
}

const adminPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Press Run · Admin</title>
<style>
  :root { --ink:#0A0A0B; --char:#19191B; --line:#2E2E33; --fg:#F4F4F5; --muted:#9A9AA2; --red:#F0413A; --blue:#0A84FF; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ink); color:var(--fg); font:15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  header { padding:16px 20px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:baseline; flex-wrap:wrap; }
  header b { font-size:20px; } header span { color:var(--muted); }
  main { display:grid; grid-template-columns:minmax(300px, 420px) 1fr; min-height:calc(100vh - 58px); }
  aside { border-right:1px solid var(--line); overflow:auto; padding:12px; }
  h3 { margin:16px 6px 8px; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--red); }
  .row { background:var(--char); border:1px solid var(--line); border-radius:12px; padding:10px 12px; margin-bottom:8px; cursor:pointer; }
  .row:hover, .row.sel { border-color:var(--red); }
  .row small { color:var(--muted); display:block; }
  .empty { color:var(--muted); padding:4px 8px; }
  .thread { display:flex; flex-direction:column; height:calc(100vh - 58px); }
  .bar { padding:12px 16px; border-bottom:1px solid var(--line); display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .msgs { flex:1; overflow:auto; padding:16px; display:flex; flex-direction:column; gap:6px; }
  .b { max-width:70%; padding:8px 12px; border-radius:16px; white-space:pre-wrap; }
  .b.in { align-self:flex-start; background:#2C2C30; } .b.out { align-self:flex-end; background:var(--blue); color:#fff; }
  .meta { font-size:11px; color:var(--muted); }
  .meta.out { align-self:flex-end; }
  img, video { max-width:220px; border-radius:12px; display:block; }
  form { display:flex; gap:8px; padding:12px 16px; border-top:1px solid var(--line); }
  input { flex:1; min-height:40px; border-radius:20px; border:1px solid var(--line); background:var(--char); color:var(--fg); padding:0 14px; font:inherit; }
  button { min-height:36px; border-radius:18px; border:0; padding:0 14px; background:var(--red); color:#fff; font:600 14px inherit; cursor:pointer; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--fg); }
  @media (max-width: 760px) { main { grid-template-columns:1fr; } aside { border-right:0; border-bottom:1px solid var(--line); max-height:50vh; } .thread { height:auto; min-height:60vh; } }
</style></head>
<body>
<header><b>Press Run admin</b><span id="counts"></span></header>
<main>
  <aside id="side"></aside>
  <section class="thread">
    <div class="bar" id="bar"><span class="meta">Pick a thread on the left.</span></div>
    <div class="msgs" id="msgs"></div>
    <form id="send" hidden><input id="text" placeholder="Text as Press Run…" autocomplete="off"><button>Send</button></form>
  </section>
</main>
<script>
const $ = id => document.getElementById(id);
let current = null;
const api = (path, body) => fetch("/admin/api/" + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}).then(r => r.json());
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const ago = iso => iso ? new Date(String(iso).split("#")[0]).toLocaleString() : "";

async function overview() {
  const { data } = await api("overview");
  $("counts").textContent = data.counts.accounts + " accounts · " + data.counts.bookers + " bookers · " + data.counts.stops + " live Press Stops";
  const side = $("side"); side.innerHTML = "";
  side.append(el("h3", "", "Taken over (bot paused)"));
  if (!data.takenOver.length) side.append(el("div", "empty", "None"));
  for (const a of data.takenOver) { const r = el("div", "row", a.name + " · #" + a.memberNo); r.append(el("small", "", a.phone + (a.step ? " · " + a.step : ""))); r.onclick = () => open(a.id); side.append(r); }
  side.append(el("h3", "", "Saved for review"));
  if (!data.review.length) side.append(el("div", "empty", "None"));
  for (const v of data.review) {
    const r = el("div", "row", v.account.name + ": " + v.text);
    r.append(el("small", "", v.step + " · " + ago(v.at)));
    const done = el("button", "ghost", "Clear"); done.onclick = async e => { e.stopPropagation(); await api("review/clear", { accountId: v.account.id, index: v.index }); overview(); };
    r.append(done); r.onclick = () => open(v.account.id); side.append(r);
  }
  side.append(el("h3", "", "Conversations"));
  if (!data.conversations.length) side.append(el("div", "empty", "None yet"));
  for (const v of data.conversations) {
    const r = el("div", "row", "#" + v.code + " · " + v.booker + " ↔ " + v.stop);
    const bits = [v.status, v.shootAt ? "shoot " + ago(v.shootAt) : "", v.post ? "post: " + v.post.stage + (v.post.views != null ? " · " + v.post.views + " views" : "") : "", v.rating ? "rated " + v.rating + "/5" : ""].filter(Boolean);
    r.append(el("small", "", bits.join(" · ")));
    const wrap = el("div"); wrap.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap";
    const b1 = el("button", "ghost", "Booker"); b1.onclick = e => { e.stopPropagation(); open(v.bookerId); };
    const b2 = el("button", "ghost", "Press Stop"); b2.onclick = e => { e.stopPropagation(); open(v.contactId); };
    wrap.append(b1, b2);
    if (v.post && v.post.stage === "posted" && v.post.views == null) {
      const b3 = el("button", "ghost", "Enter views"); b3.onclick = async e => { e.stopPropagation(); const n = Number(prompt("Views for #" + v.code + " (from the screenshot)")); if (n >= 0) { await api("views", { convId: v.id, views: n }); overview(); } };
      wrap.append(b3);
    }
    r.append(wrap); side.append(r);
  }
}

async function open(accountId) {
  current = accountId;
  const { data } = await api("thread?accountId=" + encodeURIComponent(accountId));
  const a = data.account;
  const bar = $("bar"); bar.innerHTML = "";
  bar.append(el("b", "", (a.firstName || "(no name)") + " · " + a.phone + " · #" + a.memberNo));
  bar.append(el("span", "meta", a.flow ? "in " + a.flow + ":" + a.step : "done onboarding"));
  const t = el("button", a.needsHuman ? "" : "ghost", a.needsHuman ? "Hand back to the bot" : "Take over");
  t.onclick = async () => { await api("takeover", { accountId, on: !a.needsHuman }); open(accountId); overview(); };
  bar.append(t);
  $("send").hidden = !a.needsHuman;
  const msgs = $("msgs"); msgs.innerHTML = "";
  for (const m of data.messages) {
    const side = m.direction === "out" ? "out" : "in";
    let b;
    if (m.kind === "text") b = el("div", "b " + side, m.body || "");
    else if (m.kind === "image" && m.data && m.data.url) { b = el("div", "b " + side); const i = el("img"); i.src = m.data.url; i.alt = m.data.alt || ""; b.append(i); }
    else if (m.kind === "video" && m.data && m.data.url) { b = el("div", "b " + side); const v = el("video"); v.src = m.data.url; v.controls = true; b.append(v); }
    else if (m.kind === "reaction") b = el("div", "b " + side, "Reacted " + (m.data && m.data.reaction ? m.data.reaction.emoji : ""));
    else if (m.kind === "media" && m.data && m.data.media) b = el("div", "b " + side, m.data.media.map(x => x.kind + ": " + x.url).join("\\n") + (m.body ? "\\n" + m.body : ""));
    else b = el("div", "b " + side, "[" + m.kind + "] " + (m.data && (m.data.url || "") || ""));
    msgs.append(b, el("div", "meta " + side, ago(m.createdAt)));
  }
  msgs.scrollTop = msgs.scrollHeight;
}

$("send").addEventListener("submit", async e => {
  e.preventDefault();
  const text = $("text").value.trim();
  if (!text || !current) return;
  const r = await api("send", { accountId: current, text });
  if (r.error) alert(r.error.message); else { $("text").value = ""; open(current); }
});
overview();
setInterval(overview, 15000);
</script>
</body></html>`;
