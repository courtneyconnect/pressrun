import { Store } from "./db/store";
import { buildApp } from "./app";
import { LocalFiles, R2Files } from "./media/files";
import { linq, simulator } from "./providers/provider";
import { runJobs } from "./worker";

const port = Number(process.env.PORT ?? 3000);
const store = await Store.open();
const provider = process.env.IMESSAGE_PROVIDER === "linq" ? linq : simulator;
const files = process.env.R2_BUCKET
  ? new R2Files(process.env)
  : new LocalFiles(process.env.FILES_DIR ?? "./files", process.env.PUBLIC_URL ?? `http://localhost:${port}`);
const app = buildApp(store, provider, files, { devTools: process.env.DEV_TOOLS === "1", jobSecret: process.env.JOB_SECRET });

// Background jobs (cards and clips) run in this same process every 2 seconds.
let busy = false;
setInterval(async () => {
  if (busy) return;
  busy = true;
  try { await runJobs({ store, provider, files }); } catch (e) { console.error("jobs:", e); } finally { busy = false; }
}, 2000);

console.log(`Press Run server on :${port} (provider: ${provider.name}${process.env.DEV_TOOLS === "1" ? ", dev tools on" : ""})`);
export default { port, fetch: app.fetch };
