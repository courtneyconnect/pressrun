import { Store } from "./db/store";
import { buildApp } from "./app";
import { linq, simulator } from "./providers/provider";

const store = await Store.open();
const provider = process.env.IMESSAGE_PROVIDER === "linq" ? linq : simulator;
const app = buildApp(store, provider, { devTools: process.env.DEV_TOOLS === "1", jobSecret: process.env.JOB_SECRET });

const port = Number(process.env.PORT ?? 3000);
console.log(`Press Run server on :${port} (provider: ${provider.name}${process.env.DEV_TOOLS === "1" ? ", dev tools on" : ""})`);
export default { port, fetch: app.fetch };
