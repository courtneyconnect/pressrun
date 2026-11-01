# Process notes · M1 "Build the first version" (planning session)

Session: 2026-10-28 · Press Run
Merge these into `process-notes-for-stream-team.md`. Each step is written so it can be reused for the next idea (Stream Team).

---

## Step 1 · Load the context before building

1. Give Claude the links to the business plan (Claude Docs), the HQ tracker (artifact), and the local files.
2. Ask for a short plan for the session before anything gets built, and approve it.

**Lesson:** a **cloud** Claude Code session can't see your Mac's Desktop. Before you start, pick one:
- **(a)** Work in a GitHub repo folder (`Press-Run/` here) and copy it to the Desktop later. This is what we did.
- **(b)** Turn on Remote Control for the Desktop folder. It has to be a Git folder and not hidden.

Paste anything that only lives locally (process notes, memory file) into the chat at the start.

## Step 2 · Write the onboarding text scripts first

Write the exact messages before designing anything, a few questions per message, for each side of the marketplace. Give every step an ID (B1, B2… for bookers; S1, S2… for stops) so the mockup and the build plan can refer to the same step.

Each script should include:
- **Global rules:** STOP, HELP, "human", back, skip, start over, voice notes, nudges when someone goes quiet.
- **Per question:** what answers are understood, what to send when an answer is unclear, and branches by role.
- **Unclear answers:** ask again once with examples. If it's still unclear, save it as written, flag it for review, and move on. Never ask a third time.
- **Data saved:** the list of fields at the end. It becomes the database.
- **FAQ:** answers for questions people ask mid-flow.
- **Open items:** anything that needs the founder's decision.

Files: `scripts/booker-onboarding-script.md`, `scripts/press-stop-onboarding-script.md`

## Step 3 · Build a clickable mockup from the scripts

One HTML page published as a Claude artifact, which you can open on a phone.
- **Chapters** follow the user journey: each side's onboarding → the request → picking → messages passed between the two sides → wrap-up (Run Sheet).
- **Tap to reply.** The user taps send for each reply, and the service's messages arrive with a typing indicator.
- **Real interactions** where the product depends on them. Here that's tapbacks on cards and clips, with live responses.
- **"Behind the scenes" notes** inside the thread explain what the system is doing.
- **Real names** for the founder's own items, plus clearly marked example data for everything else.
- **Test before publishing:** run a headless browser through every chapter, check for errors, and screenshot each chapter. The screenshots double as content-log footage.

File: `mockup/press-run-imessage-mockup.html` · Live: https://claude.ai/artifact/TgKNYFjdmLcrejBQuX7zvz

## Step 4 · Research the providers, then write the build plan

1. Have a sub-agent research the vendors while you write the scripts. Ask for exact source links for every fact, and "not found" where something can't be checked.
2. **Lesson:** the cloud environment's network may block vendor sites (sendblue.com and linqapp.com were blocked). Add them under Allowed domains in the environment settings **before** the session, or the comparison relies on search results.
3. Make the deciding requirement explicit. Here it was "can it tell us which message a reaction was on?" Write a concrete pass/fail test to run on a free trial before paying.
4. Write the build plan as a Claude Docs doc, one section at a time:
   - stack table
   - provider comparison
   - database tables
   - media pipeline
   - request → options
   - relay between the two sides
   - first-version scope and build order, tied to the tracker tasks
   - decisions for the founder
   - sources
5. Add two diagrams: how the parts connect, and the relay flow.

Doc: https://claude.ai/artifact/TyNQ9MsuUGzFaS7RRq1w6c

## Step 5 · Keep the tracker, content log and notes current

- Check off tracker tasks the moment each one is done (`done: true`, `doneAt`). Leave tasks open that need sign-ups, money or real-world tests.
- Log each milestone moment in the Content Log: date, title, where the screenshots are, and a post angle. Save screenshots in `content-log/<date>-<session>/`.
- Add each new step to the process notes, which is this file.

## Step 6 · Apply feedback everywhere at once (2026-11-01)

Founder feedback usually touches every deliverable. Change all of them in one pass so they never disagree:
- **Scripts** (the source of truth): bump the version line.
- **Mockup:** re-run the click-through test, then republish to the same link.
- **Build plan doc:** update the text and the diagram labels.

Feedback in this round:
- **Shorter welcome text.**
- **Always say "Press Stop(s)" in user-facing copy** (branding). Internal notes and table names can keep the short "stop".
- **Accept typed @handles or pasted profile links** wherever a handle is asked for. One shared rule in the script covers every question that asks for a handle.

- **Name the money words early.** "Service fee" means what the platform takes. "Rate" means what a seller (here, a Press Stop) charges. A vague "fees" or "booking fee" in a welcome text can sound like sellers can't charge their own price.
- **Put the founder in the mockup.** Use the founder's name as the main user so it reads like their own product. If they'd end up on both sides of a conversation, label the second phone by role, e.g. "Music for a Minute booking line".

If feedback conflicts with an earlier decision (here, the fees promise in the welcome vs. the business plan's pricing), make the requested change and flag the conflict. Don't quietly rewrite the plan.

## Step 7 · Price it, then start the build (2026-11-01)

1. **Price every paid piece before building**, with a sub-agent and the vendors' own pages. Note which numbers came from search results because a site was blocked. Look for traps: Vercel's free plan doesn't allow commercial use, so the landing page moved onto the server and saved $20/mo.
2. **Build in slices the founder can check.** Slice 1 is the texting engine with both onboarding scripts word for word, a pretend-phone page (`/dev/phone`) and tests that replay the mockup's conversations. No accounts are needed yet.
3. **Keep every message in one copy file**, so wording changes from feedback never touch the logic.
4. **Run the tests many times.** A test that passes once can still be flaky; running them 10 times found a real ordering bug.

## Rules that kept this session safe

- **Draft only.** Nothing signed up for, paid for or sent. Questions for vendors are written as drafts for the founder to send.
- **Ask before deciding** anything the brief doesn't cover. Otherwise pick and keep going, and list every pick under "Decisions" in the build plan.

## Checklist to reuse for Stream Team

- [ ] Shared business plan + tracker links and pasted local notes
- [ ] Picked where files go (repo folder or Remote Control)
- [ ] Allowed vendor domains in network settings
- [ ] Wrote onboarding script(s) with step IDs, branches and unclear-answer rules
- [ ] Built and tested the clickable mockup, then published it
- [ ] Researched vendors and wrote a pass/fail test for the must-have feature
- [ ] Wrote the build plan doc with diagrams and a decisions list
- [ ] Checked off tracker tasks, added Content Log entries, updated process notes
- [ ] Committed and pushed the files
