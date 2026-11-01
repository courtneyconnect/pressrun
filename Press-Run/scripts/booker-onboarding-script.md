# Press Run · Booker onboarding text script

Version 2 · 2026-11-01 · Milestone M1

This is every message Press Run sends a new booker in iMessage, in order. That covers artists, actors, creators, managers, labels, agencies, publicists and brands. Each step has an ID (B1, B2…) so the build plan and the mockup can refer to it.

**How to read this file**

- `PR:` is a message Press Run sends. A blank line between `PR:` blocks means separate bubbles, sent about 1 second apart with a typing indicator.
- `User:` is an example reply.
- **Accept** lists answers Press Run understands. **If unclear** is what it sends when it can't tell.
- `{name}` and similar are filled in from earlier answers.
- Keep every bubble under about 300 characters. Each step asks at most 2–3 questions.
- **Naming:** every message Press Run sends says **Press Stop** / **Press Stops**, never just "stop". The notes in this file say "stop" only as shorthand.

---

## 0. Rules that apply at every step

| User sends | Press Run does |
| --- | --- |
| `STOP`, `unsubscribe`, `quit` | `PR: You're unsubscribed and won't get more texts. Text START anytime to come back.` Marks the account opted out. Nothing else is sent. |
| `HELP` or `?` on its own | `PR: I'm Press Run. I book press runs by text. Text "menu" to see what I can do, or "human" to reach Courtney.` Then repeats the current question. |
| `human`, `real person`, `talk to someone` | `PR: Got it. Courtney from Press Run will text you in this thread soon (usually within a few hours, 10am–7pm ET).` Flags the thread for a human. The script pauses until a human hands it back. |
| `back` | Asks the previous question again. |
| `skip` | Skips the question if it's optional (marked *optional*). On a required question: `PR: I need this one to match you with the right Press Stops. A rough answer is fine.` |
| `start over` | `PR: Starting over. Your earlier answers are cleared.` Then goes to B1. |
| A question mid-flow ("how much is this?", "who are you?") | Answers from the FAQ (section 6), then: `PR: Back to where we were:` plus the current question. |
| A voice note | `PR: I can't listen to voice notes yet. Mind typing that?` *(Later: transcribe it and continue.)* |
| A photo or sticker with no text | `PR: Got it 👍` Then repeats the current question. |
| A tapback on a question (👍 ❤️) | Counts as "yes" on yes/no questions. On other questions it's ignored and the question is not repeated. |
| No reply | After 24 hours: `PR: Still want to set up Press Run? Just answer the last question when you're ready.` After 72 hours: `PR: I'll stop nudging. Text me anytime and we'll pick up where we left off.` No more nudges after that. |
| Rude or abusive message | No change in tone. The question is asked again once. After 3 abusive messages in a row, flag the thread for a human. |

**Handles and profile links** (used by B2-self, B2-roster, "add artist" and the Press Stop script's S2). People can type a handle or paste a link, in any mix:

| They send | Press Run saves |
| --- | --- |
| `@novareign`, `ig: novareign`, `novareign on TikTok` | The handle, plus the platform if they named one |
| A profile link: `instagram.com/novareign`, `tiktok.com/@jaymo.nyc`, `youtube.com/@name`, `x.com/name`, `twitch.tv/name`, `soundcloud.com/name`, `open.spotify.com/artist/…`, `music.apple.com/…/artist/…`, `linktr.ee/name` | The platform and handle read from the link, plus the link itself |
| Any other link (a personal website) | The link as written, saved as "website" |

- **A handle with no platform** (`@novareign` alone): `PR: Is @novareign on Instagram, TikTok, or somewhere else?` If there's no clear answer, save the handle with the platform left blank.
- **A link to a post or video instead of a profile:** `PR: That looks like a post. Can you send the link to the profile, or just the @handle?`
- **A shortened or private link Press Run can't read:** `PR: I couldn't open that link. Mind typing the @handle instead?`

**Unclear answers, the general rule:** ask again once with examples. If the second answer is still unclear, save it as written, tag it `needs_review`, and move on. Never ask the same question a third time.

**Unclear answer, example:**
```
PR: Who are you booking for? Reply with a number: …
User: idk kinda all of them
PR: No problem. Which is closest? 1 Yourself, 2 artists you manage, 3 a label/agency/PR firm, 4 a brand. You can change it later.
User: mostly 2 but sometimes myself
→ Saved as role = manager, and the user is also added as talent. Moves on.
```

---

## 1. Entry: how a booker arrives

The website's last screen has a **Text Press Run** button. It opens Messages with the text already typed, including a sign-up code so Press Run can match the phone to the sign-up:

```
User: Hey Press Run 👋 Sign me up. Code PR-7Q4K
```

| Case | What happens |
| --- | --- |
| Code matches a booker sign-up | Go to B1 with `{first_name}` filled in. Member number is assigned. |
| Code matches a "both" sign-up | Go to B1, then the stop script after B8 (see B8). |
| Code matches a stop sign-up | Go to the press stop script, S1. |
| Code is missing or wrong (someone typed their own message) | Go to B0. |
| The number already has an account | `PR: Welcome back, {first_name}. Text a run anytime, like "NYC Dec 3–5, 1 artist, $2k".` No onboarding. |

### B0 · No sign-up code

```
PR: Hey, this is Press Run 👋 I book press runs by text: street series, podcasts, radio, livestreams and YouTube shows.

PR: Are you here to 1 book press for yourself or someone else, or 2 list a show so people can book you? Reply 1, 2, or both.
```

- **Accept:** `1`, `book`, `booker`, `artist`, `manager` → B0a. `2`, `list`, `stop`, `my show`, `podcast` → stop script S0a. `both`, `1 and 2`, `1 2` → B0a, then the stop script after B8.
- **If unclear:** `PR: Just reply 1 if you're booking press, 2 if you run a show, or "both".`

### B0a · Name and email (only when there was no website sign-up)

```
PR: Nice. What's your name and email? (Email is only for receipts and your Run Sheets. No spam.)
```

- **Accept:** a name plus anything with `@`. Name only → `PR: And your email?` Email only → `PR: And what should I call you?`
- **If the email is invalid:** `PR: That email doesn't look right. Mind checking it?`
- Assign the Member number here, then go to B1.

---

## 2. Onboarding questions

### B1 · Welcome and role

```
PR: Welcome to Press Run, {first_name}. You're Member #{member_no} 🎟️ Since you're one of the first 1,000 members, Press Run will take NO fees from any bookings on the platform.

PR: A few quick questions so I send you the right Press Stops. Takes about 2 minutes.

PR: First: who are you booking for?
1 Yourself (artist, actor, creator)
2 Artists or talent you manage
3 A label, agency or PR firm
4 A brand
```

- Member #1,001 and later get the first bubble without the fees line: `PR: Welcome to Press Run, {first_name}. You're Member #{member_no} 🎟️`
- **Accept:** a number, or words like `me`, `myself`, `I'm the artist` (1); `manager`, `my artists`, `clients` (2); `label`, `agency`, `publicist`, `PR`, `firm` (3); `brand`, `company`, `product` (4). Several numbers (`1 and 2`) → save the main role as the first one and also mark the others.
- **If unclear:** see the example in section 0.
- **Branch:** 1 → B2-self · 2 or 3 → B2-roster · 4 → B2-brand

### B2-self · Your name on posts

```
PR: What name do you go by on posts? Add your @handle or paste a link to your profile, e.g. "Nova Reign @novareign" or "Nova Reign instagram.com/novareign"
```

- **Accept:** a name plus one or more handles **or** profile links, mixed any way. See **Handles and profile links** in section 0.
- **No handle or link given:** `PR: And your @handle or a link to your profile? Or reply "none" if you're just starting.`
- → B3

### B2-roster · Your roster

```
PR: Who's on your roster? Send each artist's name with their @handle or a link to their profile, one per line. You can add more later.
e.g.
Nova Reign @novareign
Jay Mo tiktok.com/@jaymo.nyc
```

- **Accept:** one or more lines, each a name plus handles **or** profile links (see **Handles and profile links** in section 0). Names without either are fine. They're saved, and Press Run asks for a handle or link later, when a run is planned for that artist.
- **Pasted links with no names** (a list of profile links only): Press Run reads the handle from each link and confirms it: `PR: Got @novareign and @jaymo.nyc. What names do they go by?`
- **More than 10 names:** `PR: Got {n} artists 🙌 I'll keep them all. When you book, just say who it's for.`
- **"too many" or "a lot":** `PR: Send me the 3–5 you book most. You can add the rest anytime by texting "add artist".`
- **Company name:** for role 3 only, `PR: And what's the label, agency or firm called?` Then → B3

### B2-brand · Your brand

```
PR: What's the brand, and what are you hoping for?
1 Product in the shot
2 Someone from your team appears as a guest
3 A sponsored segment
4 Not sure yet
```

- **Accept:** a brand name plus a number or words like `placement` (1), `guest` or `founder on camera` (2), `sponsor`, `segment` or `ad read` (3).
- **Name only:** `PR: And which of the 4 fits best?` (repeat the list)
- → B3 with brand wording ("What's the category?")

### B3 · Genre or niche

```
PR: What genre or niche? A few words is perfect, e.g. "drill and R&B", "stand-up comedy", "indie film", "fitness".
```

- Brands see: `PR: What's the product category? e.g. "sneakers", "energy drink", "skincare".`
- Managers or labels with 2+ artists: add `If it's different per artist, put it next to each name.`
- **Accept:** any text. Each value is mapped to a fixed tag list (music: hip-hop, R&B, pop, Latin, Afrobeats, rock/indie, country, electronic, gospel; screen: film, TV, comedy; creator: lifestyle, fitness, fashion, beauty, food, gaming, tech; brand categories). Anything unmatched is kept as written and tagged `needs_review`.
- **If unclear** (`everything`, `idk`): `PR: Totally fine. What would someone hear or see first? e.g. "rap", "romcoms", "makeup tutorials".`
- → B4

### B4 · Goal of a run

```
PR: What do you usually want a press run to do?
1 Push a new release
2 Promote a show, tour or screening
3 Grow followers
4 Press for a film or series
5 Something else
```

- **Accept:** a number, several numbers, or words (`new single`, `album drop` → 1; `concert`, `tour` → 2…). `5` or free text is saved as written.
- **Optional:** `skip` is allowed.
- **Bonus:** if they mention a date (`single drops Nov 14`), save it as an upcoming release. Press Run will offer a run around it at the end (B8).
- → B5

### B5 · Usual budget

```
PR: What do you usually spend on a full run? (Booking through Press Run is free right now. This just helps me match you.)
1 Free Press Stops only
2 Under $1k
3 $1k–$5k
4 $5k+
5 Depends on the run
```

- **Accept:** a number, or an amount (`$2,500`, `2.5k`, `around 3 grand`) → put in the matching range. A range (`1–3k`) → save the low and high.
- **If unclear** (`cheap`, `whatever works`): `PR: Ballpark is fine. Closer to free, under $1k, or more?`
- **Optional:** `skip` is saved as "depends".
- → B6

### B6 · Hard no's

```
PR: Any Press Stops you'd never do? e.g. "no prank shows", "nothing explicit", "no mornings". Or reply "none".
```

- **Accept:** any text. `none`, `nah` or `no` saves an empty list. Common items map to filter tags: `explicit`, `prank`, `political`, `alcohol/cannabis brands`, `live call-ins`, `before 10am`. The rest is saved as notes Press Run checks when matching.
- **Optional.**
- → B7

### B7 · Home base

```
PR: Last one: where are you based? We're live in New York first, with more cities soon.
```

- **Accept:** a city, borough or ZIP. Anything in NYC → `PR: NYC 🗽 perfect.` Anywhere else → `PR: Got it. Right now I only have New York Press Stops, so I'm best for runs in NYC. I'll text you when {city} opens up.` The user is added to that city's waitlist.
- → B8

### B8 · Summary, save the contact, "both" check

```
PR: You're set, {first_name} ✅
• Booking for: {role_summary}
• Niche: {niche}
• Runs are usually for: {goal}
• Budget: {budget}
• Never: {hard_nos}
Reply "edit" to change anything.
```

Then Press Run sends its **contact card** (a .vcf with the logo, so the thread shows "Press Run" instead of a number):

```
PR: [contact card: Press Run]
PR: Save me so my texts show up as Press Run.
```

Then the **both check**, which is skipped if they already said "both":

```
PR: Quick one: do you also run a show, series or podcast people could book? Reply YES to list it as a Press Stop too. Same thread, same account.
```

- `yes` or 👍 → stop script S1, skipping name and email.
- `no`, `not yet` or no reply within 10 minutes → B9.

### B9 · How to use Press Run

```
PR: Here's how it works. Text me a run anytime, like:
"NYC Nov 12–15, 2 artists, $5k budget, give me my options"

PR: I'll send numbered Press Stops, each with a card and a short clip. Pick by replying ("1 and 3") or by reacting:
❤️ 👍 🔥 💯 save it
👎 drop it and show fewer like it
❓ tell me more
```

If B4 found an upcoming release date:

```
PR: You mentioned {release} on {date}. Want me to pull options for that week? Reply YES.
```

**Edit flow:** after "edit", Press Run sends `PR: What should I change? e.g. "budget 1-3k", "add artist Jay Mo @jaymo" or "add artist Jay Mo tiktok.com/@jaymo".` It parses one change, saves it, then sends `PR: Updated ✅`. If it can't tell what to change: `PR: Which one: role, roster, niche, goal, budget, hard no's or city?`

---

## 3. Asking for a run (first use after onboarding)

Onboarding ends at B9. This section shows how the first request continues, so the mockup and build plan use the same words.

### R1 · The request

```
User: NYC Nov 12–15, 2 artists, $5k budget, give me my options
```

Press Run pulls out **city, dates, who it's for, budget, and anything else they asked for** ("street interviews only", "Thursday"). If something is missing, it asks for that one thing only:

| Missing | Press Run asks |
| --- | --- |
| Dates | `PR: Which dates? e.g. "Nov 12–15" or "next week".` |
| City (and they're not NYC-based) | `PR: Which city? Right now I've got New York.` |
| Which artists (manager with 2+ on the roster) | `PR: For who: {roster names}, or all?` |
| Budget | Not asked. It uses their onboarding budget and says so: `PR: Using your usual {budget} budget.` |

Dates in the past: `PR: Nov 12 has already passed. Did you mean next year, or another date?`
City not live yet: `PR: I don't have Press Stops in {city} yet, but I'll text you when it opens. Want options in NYC instead?`

### R2 · Confirm and send options

```
PR: On it: NYC, Wed Nov 12 – Sat Nov 15, for Nova Reign and Jay Mo, up to $5k. Pulling Press Stops now…
```

Then 3–5 options. Each option is **two bubbles**, the card image followed by the clip:

```
PR: [card image: 1 · Music for a Minute]
PR: [clip: 0:20]
PR: [card image: 2 · Penny for Your Thoughts]
PR: [clip: 0:18]
… (up to 5)
PR: That's 5 Press Stops, about $1,150 total if you book all of them. Reply with numbers ("1 and 3"), react to a card, or ask "cheaper", "more like 2", or "who's free Thursday?"
```

If fewer than 3 Press Stops fit:
`PR: Only 2 Press Stops fit those dates and budget. Want me to widen the dates or include paid Press Stops up to $X?`

### R3 · Picking

| Booker does | Press Run does |
| --- | --- |
| Replies `1 and 3`, `1,3`, `first and third`, `the Music for a Minute one` | `PR: Shortlisted 1 Music for a Minute and 3 Motivation for a Minute. Want me to ask them about dates?` |
| ❤️ 👍 🔥 or 💯 on a card or clip | Adds that stop to the shortlist quietly. Sends one confirmation after the booker has gone 30 seconds without reacting: `PR: Shortlist: 1, 3 ✅` |
| 👎 on a card | Removes it. Notes "fewer like this" for that format and price. `PR: Dropped 2. I'll show fewer like it.` If fewer than 3 options are left, a new one is sent with the next number (6). |
| ❓ on a card | Sends that stop's details: format, what you get, platforms, audience by platform, notice needed, typical filming spot. |
| Removes a reaction | Undoes the action without saying anything. |
| Reacts to a clip instead of the card | Treated the same as reacting to that stop's card. |
| `cheaper` / `more like 2` / `who's free Thursday?` | Sends a fresh set numbered from 6 onward. Old numbers keep working. |
| `book them` or `ask them` | Starts the relay (R4). |
| Number that doesn't exist (`7`) | `PR: I only sent 1–5. Which ones?` |

### R4 · Relay to the Press Stop (numbers stay private)

```
PR: Sent 🙌 I asked Music for a Minute and Motivation for a Minute about Nov 12–15. I'll pass their replies here, usually within a few hours.
```

What the stop sees in **its own** Press Run thread:

```
PR: 📩 New booking request #PR-1042
Nova Reign (R&B, @novareign) for Music for a Minute
Dates: Nov 12–15, NYC · Budget: within your $300–$500 range
Reply YES with a day and time, NO to pass, or type a question and I'll pass it on.
```

Every message between the two sides starts with who it's from, like `💬 Music for a Minute:` or `💬 Nova Reign's team:`, so each thread stays clear. Phone numbers, emails and handles typed into relayed messages are hidden until after the shoot. Press Run replaces them with `[number hidden by Press Run]` and sends a short note to the sender explaining why. After the shoot, they can swap numbers freely.

### R5 · Confirm and Run Sheet

When both sides say yes to a time:

```
PR: Booked ✅ Music for a Minute · Thu Nov 13, 2:30pm · Washington Square Park (arch side)
PR: I'll send your full Run Sheet once the other Press Stops confirm.
```

Run Sheet (sent as an image so it's easy to screenshot, plus a short text version):

```
PR: [image: Run Sheet · Nova Reign · NYC Nov 12–15]
PR: Your run: 3 Press Stops, Nov 12–14. I'll text call times the night before and 1 hour before each one. Reply "change" if anything moves.
```

---

## 4. Messages Press Run sends on its own (booker side)

| When | Message |
| --- | --- |
| Night before each stop, 8pm | `PR: Tomorrow: {stop} at {time}, {place}. Contact on site: {first name}. Reply "late" if you're running behind.` |
| 1 hour before | `PR: {stop} in 1 hour 📍 {place}` |
| Booker texts "late" | Passes it to the stop: `💬 Nova Reign's team: running about 15 min late.` |
| 48 hours after the shoot | `PR: How was {stop}? Reply 1–5. (Ratings only count Press Run bookings.)` |
| When the stop posts | `PR: {stop} posted 🎬 {views} views so far. I'll send your full recap when every Press Stop has posted.` |

---

## 5. Data saved per booker

`phone`, `first_name`, `email`, `member_no`, `roles[]` (self, manager, label, brand), `company`, `roster[]` (name, handles, niche), `brand_goal`, `niche_tags[]`, `goal[]`, `budget_low`, `budget_high`, `hard_nos[]`, `hard_no_notes`, `city`, `waitlist_city`, `opted_out`, `needs_review[]`, `onboarding_step`, `created_at`.

---

## 6. FAQ answers Press Run can give mid-flow

| Question | Answer |
| --- | --- |
| How much does it cost? | `PR: Free while we're in beta. After that it's 10% on paid bookings and $15 on free Press Stops. As one of the first 1,000 members, you'll pay NO fees on any booking.` |
| Who are you / is this a bot? | `PR: I'm Press Run's booking assistant. A real person (Courtney) checks in on every booking. Text "human" anytime.` |
| Can I just get their number? | `PR: I keep numbers private until you're booked. It keeps everyone safe from spam. Once you've shot together, swap away.` |
| Is my info shared? | `PR: Press Stops only see what's on your request: name, niche, handles and dates. Never your number or email.` |
| What cities? | `PR: New York right now. More soon, and I'll text you when your city opens.` |
| Android friend? | `PR: They can text this same number. It works over regular SMS too.` |

---

## 7. Open items for Courtney

- The B1 welcome says the first 1,000 members pay NO fees on any booking. The business plan says Founding Members pay $0 on free Press Stops for 12 months, and 10% on paid bookings. Pick one and update the other (task M3 · "Write the Founding Member offer").
- Human hours (10am–7pm ET) are a placeholder. Set the real hours.
- The reminder times (8pm the night before, and 1 hour before) are placeholders.
