// The website (served at /). Just the Press Run character running on the red
// crosswalk tiles, and one button. The button opens the sign-up, which ends in
// the Text Press Run button: Messages opens with the sign-up code already typed
// (booker script section 1).

const LIMB = "#48525A";
const LIMB_BACK = "#363E45";

/** The runner, drawn in parts so the arms and legs can move. Hip is at 0,0; feet land at y≈96. */
const runner = `
<svg class="runner" viewBox="-110 -170 220 280" aria-hidden="true">
  <g class="bob">
    <g class="limb back">
      <g transform="translate(6,-66)"><g class="upper arm-b"><line x1="0" y1="0" x2="0" y2="32"/><g transform="translate(0,32)"><g class="fore"><line x1="0" y1="0" x2="0" y2="28"/></g></g></g></g>
      <g class="thigh leg-b"><line x1="0" y1="0" x2="0" y2="48"/><g transform="translate(0,48)"><g class="shin leg-b"><line x1="0" y1="0" x2="0" y2="44"/><line x1="0" y1="44" x2="12" y2="46"/></g></g></g>
    </g>
    <path class="torso" d="M-19,-2 L-15,-70 Q4,-88 25,-72 L19,0 Q0,11 -19,-2 Z"/>
    <g transform="translate(14,-122) rotate(4)">
      <rect class="cam" x="-36" y="-22" width="62" height="44" rx="9"/>
      <path class="cam" d="M24,-9 L33,-9 L46,-19 L46,19 L33,9 L24,9 Z"/>
      <circle cx="12" cy="-1" r="6.5" fill="#F0413A"/>
      <circle cx="11.5" cy="-3" r="6" fill="#FDFCFE"/>
    </g>
    <g class="limb front">
      <g class="thigh leg-f"><line x1="0" y1="0" x2="0" y2="48"/><g transform="translate(0,48)"><g class="shin leg-f"><line x1="0" y1="0" x2="0" y2="44"/><line x1="0" y1="44" x2="12" y2="46"/></g></g></g>
      <g transform="translate(6,-66)"><g class="upper arm-f"><line x1="0" y1="0" x2="0" y2="32"/><g transform="translate(0,32)"><g class="fore"><line x1="0" y1="0" x2="0" y2="28"/></g></g></g></g>
    </g>
  </g>
</svg>`;

export function landingPage(opts: { number?: string }): string {
  const number = opts.number ?? "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Press Run</title>
<meta name="description" content="Press Run is a booking agent you text. Book press runs with street series, podcasts, radio, livestreams and YouTube shows, all from iMessage. New York first.">
<meta property="og:title" content="Press Run">
<meta property="og:description" content="Book your press run by text.">
<meta property="og:image" content="/logo-256.png">
<meta name="theme-color" content="#0A0A0B">
<link rel="icon" href="/logo-256.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root { --ink:#0A0A0B; --char:#19191B; --line:#2E2E33; --fg:#F4F4F5; --muted:#9A9AA2; --red:#F0413A; --blue:#0A84FF; --stride:.62s; --tile:clamp(66px, 19vw, 96px); }
  * { box-sizing:border-box; }
  html, body { height:100%; }
  body { margin:0; background:var(--ink); color:var(--fg); font:17px/1.45 Figtree, system-ui, -apple-system, sans-serif; overflow:hidden; }
  .sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  main { width:100%; overflow:hidden; height:100%; min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(28px, 6vh, 56px); padding:24px 16px; }

  /* The scene: the runner stays in the middle while the tiles slide past underneath. */
  .scene { position:relative; width:min(92vw, 560px); height:clamp(240px, 46vh, 400px); }
  .glow { position:absolute; left:50%; bottom:-6%; width:120%; height:60%; transform:translateX(-50%); background:radial-gradient(closest-side, rgba(240,65,58,.42), rgba(240,65,58,.12) 55%, transparent); filter:blur(8px); pointer-events:none; }
  .road { position:absolute; left:0; right:0; bottom:3%; height:27%; overflow:hidden; -webkit-mask-image:linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent); mask-image:linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent); }
  .tiles { position:absolute; inset:0 calc(var(--tile) * -2) 0 0; display:flex; align-items:center; gap:calc(var(--tile) * .34); padding-left:calc(var(--tile) * .2); animation:slide calc(var(--stride) * .9) linear infinite; }
  .tiles i { flex:0 0 calc(var(--tile) * .66); height:30%; background:var(--red); border-radius:6px; transform:skewX(-32deg); box-shadow:0 0 14px rgba(240,65,58,.95), 0 0 34px rgba(240,65,58,.55); }
  @keyframes slide { to { transform:translateX(calc(var(--tile) * -1)); } }
  .runner { position:absolute; left:50%; bottom:15%; height:88%; transform:translateX(-50%); overflow:visible; }
  .shadow { position:absolute; left:50%; bottom:13.5%; width:22%; height:5%; transform:translateX(-50%); background:radial-gradient(closest-side, rgba(0,0,0,.75), transparent); animation:shadow calc(var(--stride) / 2) ease-in-out infinite; }
  @keyframes shadow { 50% { transform:translateX(-50%) scaleX(.8); opacity:.7; } }

  .runner line { stroke-linecap:round; fill:none; }
  .limb.front line { stroke:${LIMB}; }
  .limb.back line { stroke:${LIMB_BACK}; }
  .thigh line, .shin line { stroke-width:25; }
  .upper line, .fore line { stroke-width:19; }
  .torso, .cam { fill:${LIMB}; }
  .bob, .thigh, .shin, .upper, .fore { transform-box:view-box; transform-origin:0 0; }
  .bob { animation:bob calc(var(--stride) / 2) ease-in-out infinite; }
  .thigh { animation:thigh var(--stride) linear infinite; }
  .shin { animation:shin var(--stride) linear infinite; }
  .upper { animation:upper var(--stride) ease-in-out infinite; }
  .fore { transform:rotate(-80deg); }
  .leg-b, .arm-f { animation-delay:calc(var(--stride) / -2); }
  /* Rotations: negative swings forward (to the right), positive swings back. */
  @keyframes bob { 0%, 100% { transform:translateY(0) rotate(6deg); } 50% { transform:translateY(-9px) rotate(6deg); } }
  @keyframes thigh { 0% { transform:rotate(-48deg); } 50% { transform:rotate(38deg); } 100% { transform:rotate(-48deg); } }
  @keyframes shin { 0% { transform:rotate(18deg); } 25% { transform:rotate(12deg); } 50% { transform:rotate(55deg); } 72% { transform:rotate(112deg); } 100% { transform:rotate(18deg); } }
  @keyframes upper { 0% { transform:rotate(44deg); } 50% { transform:rotate(-52deg); } 100% { transform:rotate(44deg); } }

  @media (prefers-reduced-motion: reduce) {
    .tiles, .bob, .thigh, .shin, .upper, .shadow { animation:none; }
    .leg-f.thigh { transform:rotate(-24deg); } .leg-b.thigh { transform:rotate(22deg); } .leg-b.shin { transform:rotate(40deg); }
    .arm-f { transform:rotate(-30deg); } .arm-b { transform:rotate(30deg); }
  }

  .btn { display:inline-flex; align-items:center; justify-content:center; min-height:56px; padding:0 34px; border-radius:999px; border:0; background:var(--red); color:#fff; font:600 18px Figtree, sans-serif; text-decoration:none; cursor:pointer; box-shadow:0 0 0 0 rgba(240,65,58,.5); }
  .btn:focus-visible, input:focus-visible, .choice input:focus-visible + span { outline:3px solid #fff; outline-offset:3px; }
  .btn.imsg { background:var(--blue); }
  @media (prefers-reduced-motion: no-preference) { .btn { transition:transform .15s ease; } .btn:active { transform:scale(.96); } }

  /* The sign-up sheet. */
  dialog { width:calc(100vw - 24px); max-width:440px; margin:auto; max-height:calc(100dvh - 24px); overflow:auto; border:1px solid var(--line); border-radius:28px; background:var(--char); color:var(--fg); padding:26px; }
  dialog::backdrop { background:rgba(0,0,0,.7); }
  .close { position:absolute; top:14px; right:14px; width:36px; height:36px; border-radius:50%; border:0; background:#2C2C30; color:var(--fg); font-size:20px; line-height:1; cursor:pointer; }
  h2 { font:900 34px/1 "Big Shoulders Display", Impact, sans-serif; text-transform:uppercase; margin:0 0 18px; }
  form { display:flex; flex-direction:column; gap:14px; }
  label { display:flex; flex-direction:column; gap:6px; font-weight:600; font-size:15px; }
  input[type=text], input[type=email] { min-height:50px; border-radius:14px; border:1px solid var(--line); background:var(--ink); color:var(--fg); font:17px Figtree, sans-serif; padding:0 14px; }
  fieldset { border:0; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
  legend { font-weight:600; font-size:15px; margin-bottom:6px; }
  .choice { position:relative; }
  .choice input { position:absolute; opacity:0; }
  .choice span { display:block; border:1px solid var(--line); border-radius:14px; padding:12px 14px; cursor:pointer; font-weight:400; }
  .choice input:checked + span { border-color:var(--red); background:#2A1715; }
  .err { color:#FF8F87; font-size:15px; min-height:1em; margin:0; }
  .fine { color:var(--muted); font-size:13px; margin:0; }
  .done { display:none; text-align:center; }
  .done.show { display:flex; flex-direction:column; align-items:center; gap:16px; }
  .done p { margin:0; color:#D4D4D8; }
  .done .msg { background:var(--ink); border:1px dashed var(--line); border-radius:14px; padding:12px 16px; font-size:15px; }
</style>
</head>
<body>
<main>
  <h1 class="sr">Press Run: book your press run by text</h1>
  <div class="scene" role="img" aria-label="The Press Run character running across red crosswalk tiles">
    <div class="glow"></div>
    <div class="road"><div class="tiles">${"<i></i>".repeat(14)}</div></div>
    <div class="shadow"></div>
    ${runner}
  </div>
  <button class="btn" id="start" type="button">Start here</button>
</main>

<dialog id="sheet" aria-labelledby="sheet-title">
  <button class="close" type="button" aria-label="Close" onclick="this.closest('dialog').close()">×</button>
  <form id="signup" novalidate>
    <h2 id="sheet-title">Join Press Run</h2>
    <label>Your name<input type="text" name="name" autocomplete="name" required></label>
    <label>Email<input type="email" name="email" autocomplete="email" required></label>
    <fieldset>
      <legend>I want to…</legend>
      <label class="choice"><input type="radio" name="intent" value="booker" checked><span>Book press for myself or my artists</span></label>
      <label class="choice"><input type="radio" name="intent" value="stop"><span>List my show as a Press Stop</span></label>
      <label class="choice"><input type="radio" name="intent" value="both"><span>Both</span></label>
    </fieldset>
    <p class="err" id="err" role="alert"></p>
    <button class="btn" type="submit">Continue</button>
    <p class="fine">Your email is only for receipts and Run Sheets. No spam. Message and data rates may apply. Reply STOP anytime to opt out.</p>
  </form>
  <div class="done" id="done" aria-live="polite">
    <h2>You're in.</h2>
    <p>Tap below. Messages opens with your code already typed. Just hit send.</p>
    <a class="btn imsg" id="text" href="#">Text Press Run</a>
    <div class="msg" id="msg"></div>
  </div>
</dialog>

<script>
const NUMBER = ${JSON.stringify(number)};
const sheet = document.getElementById("sheet");
document.getElementById("start").addEventListener("click", () => sheet.showModal());
sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
const form = document.getElementById("signup");
const err = document.getElementById("err");
form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  err.textContent = "";
  if (!String(data.name || "").trim()) { err.textContent = "What should we call you?"; return; }
  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(data.email || "").trim())) { err.textContent = "That email doesn't look right. Mind checking it?"; return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const r = await fetch("/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error?.message || "Something went wrong");
    const message = body.data.message;
    // iPhone uses "&body=", everything else "?body=".
    const sep = /iPhone|iPad|Macintosh/.test(navigator.userAgent) ? "&" : "?";
    document.getElementById("text").href = "sms:" + NUMBER + sep + "body=" + encodeURIComponent(message);
    document.getElementById("msg").textContent = message;
    form.style.display = "none";
    document.getElementById("done").classList.add("show");
  } catch (x) {
    err.textContent = "Couldn't sign you up just now. Try again in a minute.";
    btn.disabled = false;
  }
});
</script>
</body>
</html>`;
}
