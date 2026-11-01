# Press Run server

The texting engine behind Press Run. It runs the booker and Press Stop onboarding scripts (`Press-Run/scripts/`) word for word, and saves everything people answer.

## What works now (build slices 1–3)

- **Booker onboarding**: B0–B9, including roles, roster, handles or pasted profile links, Press Stop types, interests per artist, budget, hard no's, home base, summary, the "do you also run a show?" switch, and the release-date offer.
- **Press Stop onboarding**: S0a–S8, including several shows, creator name, platforms with follower counts, interests or General, places and open dates, deliverable and rate, notice and booking contact, collab opt-in, samples with a rights check, and the cover.
- **Rules at every step**: STOP/START, HELP, "human" (pauses the bot), back, skip on optional questions, start over, voice notes, photos sent mid-question, questions asked mid-flow (FAQ), one retry on unclear answers then saved for review, and 24h/72h nudges.
- **Website sign-up codes**: `POST /api/signup` returns the code and the pre-typed text for the Text Press Run button.
- **Test phone**: `/dev/phone` is a pretend iPhone for trying the scripts in a browser. It shows cards and clips, and has a ❤️ button for the latest one.
- **Card and clip maker** (slice 2): a background job renders the card (1080×1350 PNG with the number badge, creator, interests, audience, rate and open dates), and cuts the first 18 seconds of the episode the Press Stop attached from their camera roll into a vertical clip, with a "Booked through Press Run" end card. The full-episode link they send is saved for bookers who ask to watch the whole thing. "Use a frame" covers come from the clip.
- **Approval** (S9–S12): the card and clip are sent for approval. ❤️ 👍 🔥 💯 or "looks good" makes the Press Stop live. "rate 300–500", audience, open dates, "new cover", "use the 2nd episode", "start at 0:40" and "different part" remake just what changed. 👎 asks what to change, and the fourth round goes to Courtney. A video that won't open sends them back to attach it again.
- **Run requests** (slice 3): "NYC Nov 12–15, 2 artists, $5k budget" is read into city, dates, artists and budget. Press Run asks only for what's missing (dates, city, or which artists), says when it's using their usual budget, and handles past dates and cities that aren't live yet.
- **Matching**: live Press Stops in the window with enough notice, within budget, skipping hard no's; ranked by the Press Stop types they asked for, interest matches (named in the summary), open dates and audience, with fewer of a format they 👎'd.
- **Options**: 5 or fewer come as numbered cards with clips plus a summary; more come as one master list image, then cards for the numbers they pick, "show me all" (5 at a time) and "more".
- **Picking**: numbers, "first and third", or a show's name shortlists (crediting the creator). ❤️ 👍 🔥 💯 shortlist quietly with one summary after 30 quiet seconds; 👎 drops and shows fewer like it; ❓ sends details; "full episode 2" sends the creator's link; "cheaper", "more like 2", "who's free Thursday?" and "only podcasts" / "under $300" / "Thursday only" send fresh options numbered after the last.

## Next slices

1. Passing messages between both sides (SHARE, creator credit), booking, Run Sheet and calendar file.
2. Edit review, posted links, recap image.
3. Linq adapter (needs the free trial's API access), landing page, admin page, deploy.

## Run it

```bash
cd server
bun install
bun test                         # 38 tests: the mockup conversations, parsers, card/clip, approval and run requests
DEV_TOOLS=1 bun run dev          # then open http://localhost:3000/dev/phone
```

Settings (environment variables):

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | `sqlite://pressrun.db` locally (default). In production, the Postgres URL from Neon. |
| `IMESSAGE_PROVIDER` | `simulator` (default) or `linq` once that adapter is built. |
| `DEV_TOOLS` | `1` turns on `/dev/phone` and `/dev/*`. Keep it off in production. |
| `JOB_SECRET` | Protects `POST /jobs/nudges`, which an hourly job calls. |
| `PORT` | Defaults to 3000. |
| `FILES_DIR`, `PUBLIC_URL` | Local file storage for cards and clips (served at `/files`). Defaults to `./files` and `http://localhost:PORT`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | When `R2_BUCKET` is set, cards and clips go to Cloudflare R2 instead. |

Needs `ffmpeg` installed. Nothing is downloaded from Instagram, TikTok or YouTube links: previews come from attached videos, and links are only passed on.

## How it's laid out

- `src/engine/copy.ts`: every message Press Run sends. Change wording here.
- `src/engine/parse.ts`: reads free-text replies (rule-based; each rule maps to an "Accept:" line in the scripts).
- `src/engine/flows/booker.ts`, `src/engine/flows/stop.ts`: one entry per script step.
- `src/engine/engine.ts`: the rules that apply at every step, and moving between steps.
- `src/db/store.ts`: storage and the job queue. Same queries on SQLite and Postgres.
- `src/media/`: card rendering (Satori + resvg), clip cutting (ffmpeg), file storage (local or R2).
- `src/run/`: reading run requests and matching (`match.ts`), numbering and sending options (`options.ts`), and everything a booker texts about them (`picking.ts`).
- `src/worker.ts`: background jobs that build cards and clips, send options and the master list, and send shortlist summaries.
