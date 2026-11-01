// The website (served at /). It only explains Press Run and takes sign-ups.
// The last screen is the Text Press Run button, which opens Messages with the
// sign-up code already typed (booker script section 1).

export function landingPage(opts: { number?: string }): string {
  const number = opts.number ?? "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Press Run · Book press runs by text</title>
<meta name="description" content="Press Run is a booking agent you text. Plan a press run with street series, podcasts, radio, livestreams and YouTube shows, all from iMessage. New York first.">
<meta property="og:title" content="Press Run · Book press runs by text">
<meta property="og:description" content="Plan a press run with street series, podcasts, radio, livestreams and YouTube shows, all from iMessage.">
<meta property="og:image" content="/logo-256.png">
<meta name="theme-color" content="#0A0A0B">
<link rel="icon" href="/logo-256.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Figtree:wght@400;600&family=IBM+Plex+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  :root { --ink:#0A0A0B; --char:#19191B; --line:#2E2E33; --fg:#F4F4F5; --muted:#9A9AA2; --red:#F0413A; --blue:#0A84FF; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; background:var(--ink); color:var(--fg); font:17px/1.5 Figtree, system-ui, -apple-system, sans-serif; }
  a { color:inherit; }
  .wrap { max-width:1040px; margin:0 auto; padding:0 20px; }
  .mono { font-family:"IBM Plex Mono", ui-monospace, monospace; font-weight:600; letter-spacing:.18em; text-transform:uppercase; font-size:13px; color:var(--red); }
  h1, h2 { font-family:"Big Shoulders Display", Impact, sans-serif; font-weight:900; text-transform:uppercase; line-height:.92; margin:0; letter-spacing:.005em; }
  h1 { font-size:clamp(56px, 11vw, 120px); }
  h2 { font-size:clamp(40px, 6vw, 64px); }
  header { display:flex; align-items:center; justify-content:space-between; padding:18px 0; }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; font-family:"Big Shoulders Display", sans-serif; font-weight:900; font-size:26px; text-transform:uppercase; }
  .brand img { width:40px; height:40px; border-radius:10px; }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:52px; padding:0 26px; border-radius:999px; border:0; background:var(--red); color:#fff; font:600 17px Figtree, sans-serif; text-decoration:none; cursor:pointer; }
  .btn:focus-visible, input:focus-visible, .choice input:focus-visible + span { outline:3px solid #fff; outline-offset:2px; }
  .btn.ghost { background:transparent; border:2px solid var(--line); }
  .btn.imsg { background:var(--blue); }
  .hero { display:grid; grid-template-columns:1.15fr .85fr; gap:40px; align-items:center; padding:48px 0 72px; }
  .hero p.lead { font-size:20px; color:#D4D4D8; max-width:34em; margin:22px 0 28px; }
  .crosswalk { display:flex; gap:12px; margin:0 0 22px; transform:skewX(-28deg); }
  .crosswalk i { width:34px; height:12px; background:var(--red); border-radius:3px; }
  .phone { background:var(--char); border:1px solid var(--line); border-radius:34px; padding:18px 14px; display:flex; flex-direction:column; gap:8px; max-width:360px; justify-self:end; width:100%; }
  .phone .who { text-align:center; font-size:12px; color:var(--muted); margin-bottom:6px; }
  .b { max-width:82%; padding:9px 13px; border-radius:18px; font-size:15px; line-height:1.3; }
  .b.me { align-self:flex-end; background:var(--blue); color:#fff; border-bottom-right-radius:5px; }
  .b.pr { align-self:flex-start; background:#2C2C30; border-bottom-left-radius:5px; }
  .card-mini { align-self:flex-start; width:62%; aspect-ratio:4/5; border-radius:16px; background:linear-gradient(160deg, #26262B, #0A0A0B 70%); border:1px solid var(--line); padding:12px; display:flex; flex-direction:column; justify-content:flex-end; position:relative; }
  .card-mini .n { position:absolute; top:10px; left:10px; width:28px; height:28px; border-radius:50%; background:var(--red); display:grid; place-items:center; font:900 17px "Big Shoulders Display", sans-serif; }
  .card-mini b { font:900 22px/1 "Big Shoulders Display", sans-serif; text-transform:uppercase; }
  .card-mini small { color:var(--muted); font-size:11px; }
  .tap { align-self:flex-start; margin:-14px 0 0 8px; background:#3A3A40; border-radius:12px; padding:2px 7px; font-size:13px; }
  section { padding:72px 0; border-top:1px solid var(--line); }
  .steps { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; margin-top:32px; }
  .step { background:var(--char); border:1px solid var(--line); border-radius:20px; padding:24px; }
  .step .num { font:900 44px/1 "Big Shoulders Display", sans-serif; color:var(--red); }
  .step h3 { margin:10px 0 6px; font-size:20px; }
  .step p { margin:0; color:#C8C8CE; }
  .step code { font:600 14px "IBM Plex Mono", monospace; color:var(--fg); background:var(--ink); padding:2px 6px; border-radius:6px; }
  .types { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
  .types span { border:1px solid var(--line); border-radius:999px; padding:8px 16px; color:#D4D4D8; }
  .split { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start; }
  .split p { color:#C8C8CE; }
  .founding { background:var(--red); color:#fff; border-radius:28px; padding:36px; }
  .founding .mono { color:#fff; opacity:.85; }
  .founding p { font-size:19px; margin:14px 0 0; }
  form { background:var(--char); border:1px solid var(--line); border-radius:28px; padding:28px; display:flex; flex-direction:column; gap:16px; }
  label { display:flex; flex-direction:column; gap:6px; font-weight:600; font-size:15px; }
  input[type=text], input[type=email] { min-height:50px; border-radius:14px; border:1px solid var(--line); background:var(--ink); color:var(--fg); font:17px Figtree, sans-serif; padding:0 14px; }
  fieldset { border:0; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
  legend { font-weight:600; font-size:15px; margin-bottom:6px; }
  .choice { position:relative; }
  .choice input { position:absolute; opacity:0; }
  .choice span { display:block; border:1px solid var(--line); border-radius:14px; padding:12px 14px; cursor:pointer; }
  .choice input:checked + span { border-color:var(--red); background:#2A1715; }
  .err { color:#FF8F87; font-size:15px; min-height:1em; margin:0; }
  .done { display:none; text-align:center; }
  .done.show { display:flex; flex-direction:column; align-items:center; gap:16px; }
  .done .msg { background:var(--ink); border:1px dashed var(--line); border-radius:14px; padding:12px 16px; font-size:15px; color:#D4D4D8; }
  .fine { color:var(--muted); font-size:14px; }
  footer { padding:40px 0 56px; color:var(--muted); font-size:14px; border-top:1px solid var(--line); }
  @media (max-width: 820px) {
    .hero, .split { grid-template-columns:1fr; }
    .phone { justify-self:stretch; max-width:none; }
    .steps { grid-template-columns:1fr; }
    section { padding:56px 0; }
  }
  @media (prefers-reduced-motion: no-preference) { .btn { transition:transform .15s ease; } .btn:active { transform:scale(.97); } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="/logo-256.png" alt="">Press Run</a>
    <a class="btn ghost" href="#join">Join</a>
  </header>

  <div class="hero">
    <div>
      <div class="crosswalk" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <h1>Book your press run by text.</h1>
      <p class="lead">Press Run is a booking agent you text. Send your dates, pick from street series, podcasts, radio, livestreams and YouTube shows, and Press Run handles the back-and-forth until the shoot. All in iMessage. No app.</p>
      <a class="btn" href="#join">Get started</a>
    </div>
    <div class="phone" aria-label="Example Press Run text thread">
      <div class="who">Press Run</div>
      <div class="b me">NYC Nov 12–15, 2 artists, $5k budget, give me my options</div>
      <div class="b pr">On it. Pulling Press Stops now…</div>
      <div class="card-mini"><span class="n">1</span><b>Music for a Minute</b><small>with Courtney · Street series</small></div>
      <div class="tap" aria-hidden="true">❤️</div>
      <div class="b pr">Shortlisted 1, Courtney from Music for a Minute. Want me to ask about dates?</div>
      <div class="b me">yes</div>
    </div>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="mono">For artists, managers, labels, publicists and brands</div>
    <h2 style="margin-top:12px">Plan a whole run in one thread.</h2>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Text your dates</h3><p>Like <code>NYC Nov 12–15, 2 artists, $5k</code>. Press Run only asks for what's missing.</p></div>
      <div class="step"><div class="num">2</div><h3>Pick by reply or ❤️</h3><p>Each Press Stop comes as a card and an 18-second clip. Reply with numbers or react to the ones you want.</p></div>
      <div class="step"><div class="num">3</div><h3>Press Run books it</h3><p>It asks each show, passes replies both ways, and sends your Run Sheet with reminders and a calendar file.</p></div>
    </div>
    <div class="types" aria-label="Kinds of Press Stops">
      <span>Street series</span><span>Podcasts</span><span>Radio</span><span>Livestreams</span><span>YouTube shows</span><span>Creator features and collabs</span>
    </div>
  </div>
</section>

<section>
  <div class="wrap split">
    <div>
      <div class="mono">For shows and creators</div>
      <h2 style="margin-top:12px">Become a Press Stop.</h2>
    </div>
    <div>
      <p>List your show by text in a few minutes. Press Run makes your card and a short clip from your own episode, and sends you booking requests that fit your dates.</p>
      <p>You set your rate. Your number stays private until you choose to share it. Reply YES with a day, time and place, and Press Run takes care of the rest.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="founding">
      <div class="mono">Founding Members · New York first</div>
      <h2 style="margin-top:12px">Free while we're starting out.</h2>
      <p>The first 1,000 members pay no service fees on any booking for 12 months after fees start.</p>
    </div>
  </div>
</section>

<section id="join">
  <div class="wrap split">
    <div>
      <div class="mono">Join Press Run</div>
      <h2 style="margin-top:12px">Sign up, then say hi by text.</h2>
      <p class="fine" style="margin-top:18px">Your email is only for receipts and Run Sheets. No spam. Message and data rates may apply. Reply STOP anytime to opt out.</p>
    </div>
    <div>
      <form id="signup" novalidate>
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
      </form>
      <div class="done" id="done" aria-live="polite">
        <h2>You're in.</h2>
        <p>Tap below. Messages opens with your code already typed. Just hit send.</p>
        <a class="btn imsg" id="text" href="#">Text Press Run</a>
        <div class="msg" id="msg"></div>
      </div>
    </div>
  </div>
</section>

<div class="wrap"><footer>© 2026 Press Run · New York</footer></div>

<script>
const NUMBER = ${JSON.stringify(number)};
const form = document.getElementById("signup");
const err = document.getElementById("err");
form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  err.textContent = "";
  if (!String(data.name || "").trim()) { err.textContent = "What should we call you?"; return; }
  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(data.email || "").trim())) { err.textContent = "That email doesn't look right. Mind checking it?"; return; }
  const btn = form.querySelector("button");
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
