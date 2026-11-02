# Website preview (Vercel)

Plain files for a quick look at the website on Vercel: `index.html` is built from
`server/src/web/landing.ts` with `cd server && bun scripts/build-site.ts`.

`api/signup.js` is preview-only: it hands back a sign-up code and the pre-typed
text but saves nothing. In production the website is served by the Press Run
server itself, where sign-ups are saved and the code links the phone to the sign-up.

Built with the Sendblue test number: `PRESS_RUN_NUMBER=+14055687605 bun scripts/build-site.ts`.
