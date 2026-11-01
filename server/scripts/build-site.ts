// Builds the website as plain files in ../site for a Vercel preview.
// Run from server/: bun scripts/build-site.ts
// The preview's /api/signup (site/api/signup.js) hands back a code but saves
// nothing; the real sign-up runs on the Press Run server.

import { copyFile, mkdir } from "node:fs/promises";
import { landingPage } from "../src/web/landing";

const out = new URL("../../site/", import.meta.url).pathname;
await mkdir(out, { recursive: true });
await Bun.write(out + "index.html", landingPage({ number: process.env.PRESS_RUN_NUMBER }));
for (const f of ["logo-256.png", "apple-touch-icon.png"]) await copyFile(new URL(`../public/${f}`, import.meta.url).pathname, out + f);
console.log("Built", out);
