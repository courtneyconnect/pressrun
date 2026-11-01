# Press Run server

The texting engine behind Press Run. It runs the booker and Press Stop onboarding scripts (`Press-Run/scripts/`) word for word, and saves everything people answer.

## What works now (build slices 1–5)

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
- **Booking requests** (slice 4): "ask them" (or "yes" to "Want me to ask about dates?") sends each shortlisted Press Stop a numbered request (#PR-1042) in its own thread, with the artist's profile link in its own bubble. It goes to the show's booking contact if they named a teammate.
- **Passing messages**: every message is labelled ("💬 Courtney from Music for a Minute:", "💬 Nova Reign's team:"). Replies find their conversation by the bubble they reply to, a #PR code, a show or artist name, the only open one, or the one that just wrote. If it's still unclear, Press Run asks which. Phone numbers and emails are hidden until the sender replies SHARE.
- **Booking**: a Press Stop's YES with a day, time and place goes to the booker with "lock it" to book. NO tells the booker. YES with no details asks for them. Booking tells both sides and sends the Press Stop a calendar file. A new time can be locked again; old reminders are skipped.
- **Run Sheet**: once every Press Stop asked has answered or expired, the booker gets the Run Sheet image, a text version and one calendar file with every stop.
- **Reminders and timeouts**: 8pm the night before and 1 hour before, to both sides. "late" tells the Press Stop. A Press Stop that hasn't answered is nudged at 12 hours and the request expires at 24.
- **After the shoot** (slice 5): at 6pm on the shoot day the Press Stop is asked for the edit (nudges at 3 and 7 days, then it's flagged). The edit goes to the booker as a video: ❤️ 👍 🔥 💯 or "approved" approves it, 👎 asks what to change, and any other reply is passed on as changes. Approval tells the creator to post, reminds them to add the artist as a collaborator, and mentions @pressrun only if they opted in (or asks, for "ask"). No answer on an edit: nudge at 48 hours, flagged at 72 (silence doesn't count as approval).
- **Rating**: 48 hours after the shoot the booker rates it 1–5. Ratings of 1–2 are flagged.
- **Posted link and views**: the creator's live link goes to the booker with a preview. A week later Press Run asks the creator for the view count (a number, or a screenshot that Courtney types in on the admin page). Reading views straight from TikTok/YouTube links comes later.
- **Recap**: once every booked stop has posted with views (or 14 days after the last shoot), the booker gets the recap image with each post's views and the total.
- **Website** (`/`): "Book Your Next Press Run." in one line, the Press Run character running on the red crosswalk tiles under it, and one **Start here** button. The line uses Inter Tight Bold (free) as a stand-in for Neue Haas Grotesk Display 75 Bold (paid). It opens the sign-up (name, email, book / list / both), which ends in the **Text Press Run** button: Messages opens with the code typed. Set `PRESS_RUN_NUMBER` once there's a number.
- **Admin page** (`/admin`, needs `ADMIN_PASSWORD`, username `courtney`): threads that asked for a person, replies saved for review, every conversation and its stage. Take a thread over (the bot goes quiet), text as Press Run, hand it back, clear review items, and type in view counts from screenshots.

## Next slices

1. Linq adapter (needs the free trial's API access and docs).
2. Reading views from TikTok/YouTube links, and the 30-day view refresh on the recap.
3. Privacy policy and terms pages (tracker M0).

## Run it

```bash
cd server
bun install
bun test                         # 55 tests: the mockup conversations, parsers, card/clip, approval, run requests, booking, after the shoot, website and admin
TEST_DATABASE_URL=postgres://… bun test   # the same tests on a throwaway Postgres (it wipes that database)
DEV_TOOLS=1 bun run dev          # then open http://localhost:3000/dev/phone
```

Settings (environment variables):

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | `sqlite://pressrun.db` locally (default). In production, the Postgres URL from Neon. |
| `IMESSAGE_PROVIDER` | `simulator` (default) or `linq` once that adapter is built. |
| `DEV_TOOLS` | `1` turns on `/dev/phone` and `/dev/*`. Keep it off in production. |
| `JOB_SECRET` | Protects `POST /jobs/nudges`. Optional: the server also sends the nudges itself every hour. |
| `PORT` | Defaults to 3000. |
| `ADMIN_PASSWORD` | Turns on `/admin` (username `courtney`). |
| `PRESS_RUN_NUMBER` | The iMessage number the website's Text Press Run button opens, like `+12125550123`. |
| `FILES_DIR`, `PUBLIC_URL` | Local file storage for cards and clips (served at `/files`). Defaults to `./files` and `http://localhost:PORT`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | When `R2_BUCKET` is set, cards and clips go to Cloudflare R2 instead. |

Needs `ffmpeg` installed. Nothing is downloaded from Instagram, TikTok or YouTube links: previews come from attached videos, and links are only passed on.

## Deploy (not done yet: needs Courtney's accounts)

Everything is ready for Railway with a Neon Postgres database and Cloudflare R2 for cards and clips. Nothing has been signed up for.

1. Neon: create a project and copy its connection string (`DATABASE_URL`).
2. Cloudflare R2: create a bucket with public access and an API token (`R2_*`).
3. Railway: new project from the GitHub repo, root directory `server`. It builds the `Dockerfile` (Bun + ffmpeg) and checks `/health`.
4. Set `DATABASE_URL`, `R2_*`, `ADMIN_PASSWORD`, `PRESS_RUN_NUMBER`, `IMESSAGE_PROVIDER=linq` (once the adapter exists) and `PUBLIC_URL`. Leave `DEV_TOOLS` off.
5. Point the domain at Railway. The website is served by this same server at `/`.

The Docker build couldn't be run in the build session (no Docker there); the first Railway deploy is its test.

## How it's laid out

- `src/engine/copy.ts`: every message Press Run sends. Change wording here.
- `src/engine/parse.ts`: reads free-text replies (rule-based; each rule maps to an "Accept:" line in the scripts).
- `src/engine/flows/booker.ts`, `src/engine/flows/stop.ts`: one entry per script step.
- `src/engine/engine.ts`: the rules that apply at every step, and moving between steps.
- `src/db/store.ts`: storage and the job queue. Same queries on SQLite and Postgres.
- `src/media/`: card rendering (Satori + resvg), clip cutting (ffmpeg), file storage (local or R2).
- `src/run/`: reading run requests and matching (`match.ts`), numbering and sending options (`options.ts`), everything a booker texts about them (`picking.ts`), passing messages and booking (`relay.ts`), and New York times and calendar files (`time.ts`).
- `src/run/followup.ts`: after the shoot (edit review, posted link, views, rating, recap).
- `src/web/`: the website (`landing.ts`) and the admin page (`admin.ts`). `public/` holds the logo.
- `src/worker.ts`: background jobs that build cards and clips, send options and the master list, shortlist summaries, request nudges and expiry, reminders, calendar files, the Run Sheet, and everything after the shoot.
