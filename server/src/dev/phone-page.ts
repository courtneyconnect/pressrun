// /dev/phone: a pretend iPhone for testing the scripts before the real line
// exists. Pick a phone number, text Press Run, and watch what it saves.

export const phonePage = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Press Run test phone</title>
<style>
  :root { color-scheme: dark; --bg:#000; --in:#26262a; --out:#0a84ff; --fg:#f4f4f5; --muted:#9a9aa2; --red:#f0413a; --line:#2e2e33; }
  * { box-sizing: border-box; }
  body { margin:0; background:#0a0a0b; color:var(--fg); font:15px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .wrap { display:grid; grid-template-columns:minmax(0,420px) minmax(0,1fr); gap:20px; padding:20px max(16px, env(safe-area-inset-left)); height:100vh; }
  @media (max-width:860px){ .wrap { grid-template-columns:1fr; height:auto; } }
  .phone { background:var(--bg); border:1px solid var(--line); border-radius:28px; display:flex; flex-direction:column; min-height:620px; max-height:calc(100vh - 40px); overflow:hidden; }
  .top { padding:12px; border-bottom:1px solid #1c1c1f; display:flex; gap:8px; align-items:center; }
  .top input { flex:1; min-width:0; background:#16161a; border:1px solid var(--line); color:var(--fg); border-radius:10px; padding:8px 10px; }
  .top button, .tools button { background:#1c1c20; border:1px solid var(--line); color:var(--fg); border-radius:10px; padding:8px 10px; cursor:pointer; }
  .thread { flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:4px; }
  .thread > * { flex-shrink:0; }
  .b { max-width:80%; padding:8px 12px; border-radius:18px; white-space:pre-wrap; overflow-wrap:anywhere; }
  .in { align-self:flex-start; background:var(--in); }
  .out { align-self:flex-end; background:var(--out); color:#fff; }
  .att { font-size:12px; color:var(--muted); align-self:flex-start; border:1px dashed var(--line); border-radius:12px; padding:6px 10px; }
  .tools { display:flex; gap:6px; flex-wrap:wrap; padding:6px 10px 0; }
  .compose { display:flex; gap:8px; padding:10px; }
  .compose textarea { flex:1; min-width:0; resize:none; height:44px; background:#16161a; border:1px solid #3a3a3f; color:var(--fg); border-radius:18px; padding:10px 14px; font:inherit; }
  .compose button { background:var(--out); color:#fff; border:0; border-radius:18px; padding:0 16px; font-weight:600; cursor:pointer; }
  .side { overflow:auto; }
  .side h2 { font-size:13px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin:0 0 8px; }
  pre { background:#121214; border:1px solid var(--line); border-radius:12px; padding:12px; font-size:12px; overflow:auto; white-space:pre-wrap; }
  .signup { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
  .signup input, .signup select { background:#16161a; border:1px solid var(--line); color:var(--fg); border-radius:10px; padding:8px; }
</style></head>
<body><div class="wrap">
  <section class="phone">
    <div class="top">
      <label for="phone" style="font-size:12px;color:var(--muted)">Phone</label>
      <input id="phone" value="+15550000001">
      <button id="reset" type="button" title="Use a fresh number">New number</button>
    </div>
    <div class="thread" id="thread" aria-live="polite"></div>
    <div class="tools">
      <button type="button" data-media="image">📷 Photo</button>
      <button type="button" data-media="video">🎬 Video</button>
      <button type="button" data-media="audio">🎤 Voice note</button>
      <button type="button" data-react="❤️">❤️ last card/clip</button>
    </div>
    <form class="compose" id="compose">
      <label for="msg" hidden>Message</label>
      <textarea id="msg" placeholder="iMessage"></textarea>
      <button type="submit">Send</button>
    </form>
  </section>
  <section class="side">
    <h2>Website sign-up (makes a code)</h2>
    <form class="signup" id="signup">
      <input id="su-name" placeholder="Name" value="Courtney">
      <input id="su-email" placeholder="Email" value="dots@example.com">
      <select id="su-intent"><option value="booker">Booker</option><option value="stop">Press Stop</option><option value="both">Both</option></select>
      <button type="submit">Get code</button>
    </form>
    <h2>What Press Run saved</h2>
    <pre id="state">Text the number to start.</pre>
  </section>
</div>
<script>
const $ = id => document.getElementById(id);
const phone = () => $("phone").value.trim();
let shown = "";
async function load() {
  const r = await fetch("/dev/thread?phone=" + encodeURIComponent(phone())).then(r => r.json());
  const { messages: msgs, ...info } = r.data;
  $("state").textContent = JSON.stringify(info, null, 2);
  // Redraw only when something new arrived, so images and videos aren't reloaded every poll.
  const key = phone() + ":" + msgs.length;
  if (key === shown) return;
  shown = key;
  const t = $("thread"); t.innerHTML = "";
  for (const m of msgs) {
    const d = document.createElement("div");
    if (m.kind === "text" && m.body) { d.className = "b " + (m.direction === "out" ? "in" : "out"); d.textContent = m.body; }
    else if (m.direction === "out" && m.kind === "image" && m.data && m.data.url) { d.className = "b in"; d.style.padding = "0"; d.style.overflow = "hidden"; const img = document.createElement("img"); img.src = m.data.url; img.alt = m.data.alt || ""; img.style.cssText = "display:block;width:240px"; d.appendChild(img); }
    else if (m.direction === "out" && m.kind === "video" && m.data && m.data.url) { d.className = "b in"; d.style.padding = "0"; d.style.overflow = "hidden"; const v = document.createElement("video"); v.src = m.data.url; v.controls = true; v.playsInline = true; v.style.cssText = "display:block;width:180px"; d.appendChild(v); }
    else { d.className = "att"; d.textContent = (m.direction === "out" ? "Press Run sent: " : "You sent: ") + m.kind + (m.data ? " " + JSON.stringify(m.data) : ""); if (m.direction === "in") d.style.alignSelf = "flex-end"; }
    t.appendChild(d);
  }
  t.scrollTop = t.scrollHeight;
  t.querySelectorAll("img, video").forEach(m => m.addEventListener(m.tagName === "IMG" ? "load" : "loadedmetadata", () => { t.scrollTop = t.scrollHeight; }));
}
async function send(body) {
  await fetch("/dev/inbound", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: phone(), text: "", ...body }) });
  await load();
}
$("compose").addEventListener("submit", e => { e.preventDefault(); const v = $("msg").value; if (!v.trim()) return; $("msg").value = ""; send({ text: v }); });
$("msg").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("compose").requestSubmit(); } });
document.querySelectorAll("[data-media]").forEach(b => b.onclick = () => send({ media: [{ kind: b.dataset.media, url: "https://example.com/test." + (b.dataset.media === "image" ? "jpg" : b.dataset.media === "video" ? "mp4" : "m4a") }] }));
document.querySelector("[data-react]").onclick = () => send({ reaction: { emoji: "❤️", targetProviderId: "last", removed: false } });
$("reset").onclick = () => { $("phone").value = "+1555" + String(Math.floor(Math.random() * 1e7)).padStart(7, "0"); load(); };
$("phone").addEventListener("change", load);
$("signup").addEventListener("submit", async e => {
  e.preventDefault();
  const r = await fetch("/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: $("su-name").value, email: $("su-email").value, intent: $("su-intent").value }) }).then(r => r.json());
  if (r.data) $("msg").value = r.data.message;
});
load();
setInterval(load, 3000);
</script></body></html>`;
