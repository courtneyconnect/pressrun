import { Store } from "./db/store";
import { buildApp } from "./app";
import { LocalFiles, R2Files } from "./media/files";
import { linq, simulator } from "./providers/provider";
import { sendblue, type SendblueConfig } from "./providers/sendblue";
import { transmit } from "./outbox";
import { runJobs } from "./worker";
import { Engine } from "./engine/engine";

const port = Number(process.env.PORT ?? 3000);
const store = await Store.open();
const provider = process.env.IMESSAGE_PROVIDER === "linq" ? linq
  : process.env.IMESSAGE_PROVIDER === "sendblue" ? sendblue(process.env as SendblueConfig)
  : simulator;
const files = process.env.R2_BUCKET
  ? new R2Files(process.env)
  : new LocalFiles(process.env.FILES_DIR ?? "./files", process.env.PUBLIC_URL ?? `http://localhost:${port}`);
const app = buildApp(store, provider, files, {
  devTools: process.env.DEV_TOOLS === "1",
  jobSecret: process.env.JOB_SECRET,
  adminPassword: process.env.ADMIN_PASSWORD,
  pressRunNumber: process.env.PRESS_RUN_NUMBER,
  webhookToken: process.env.WEBHOOK_TOKEN,
});

// Background jobs (cards and clips) run in this same process every 2 seconds.
let busy = false;
setInterval(async () => {
  if (busy) return;
  busy = true;
  try { await runJobs({ store, provider, files }); } catch (e) { console.error("jobs:", e); } finally { busy = false; }
}, 2000);

// The 24h/72h onboarding nudges, hourly. (POST /jobs/nudges does the same, for an outside scheduler.)
const nudger = new Engine(store, undefined, (a, out) => transmit(store, provider, a.phone, out));
setInterval(async () => {
  try {
    for (const s of await nudger.nudges()) await transmit(store, provider, s.phone, s.out);
  } catch (e) { console.error("nudges:", e); }
}, 60 * 60_000);

console.log(`Press Run server on :${port} (provider: ${provider.name}${process.env.DEV_TOOLS === "1" ? ", dev tools on" : ""})`);
export default { port, fetch: app.fetch };
