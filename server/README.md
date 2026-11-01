# Press Run server

The texting engine behind Press Run. It runs the booker and Press Stop onboarding scripts (`Press-Run/scripts/`) word for word, and saves everything people answer.

## What works now (build slice 1)

- **Booker onboarding**: B0–B9, including roles, roster, handles or pasted profile links, Press Stop types, interests per artist, budget, hard no's, home base, summary, the "do you also run a show?" switch, and the release-date offer.
- **Press Stop onboarding**: S0a–S8, including several shows, creator name, platforms with follower counts, interests or General, places and open dates, deliverable and rate, notice and booking contact, collab opt-in, samples with a rights check, and the cover.
- **Rules at every step**: STOP/START, HELP, "human" (pauses the bot), back, skip on optional questions, start over, voice notes, photos sent mid-question, questions asked mid-flow (FAQ), one retry on unclear answers then saved for review, and 24h/72h nudges.
- **Website sign-up codes**: `POST /api/signup` returns the code and the pre-typed text for the Text Press Run button.
- **Test phone**: `/dev/phone` is a pretend iPhone for trying the scripts in a browser.

## Next slices

1. Card and clip maker, then the S9 approval loop.
2. Run requests → numbered options (and the master list), picking by reply and reaction.
3. Passing messages between both sides (SHARE, creator credit), booking, Run Sheet and calendar file.
4. Edit review, posted links, recap image.
5. Linq adapter (needs the free trial's API access), landing page, admin page, deploy.

## Run it

```bash
cd server
bun install
bun test                         # 21 tests, replaying the mockup conversations
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

## How it's laid out

- `src/engine/copy.ts`: every message Press Run sends. Change wording here.
- `src/engine/parse.ts`: reads free-text replies (rule-based; each rule maps to an "Accept:" line in the scripts).
- `src/engine/flows/booker.ts`, `src/engine/flows/stop.ts`: one entry per script step.
- `src/engine/engine.ts`: the rules that apply at every step, and moving between steps.
- `src/db/store.ts`: storage. Same queries on SQLite and Postgres.
