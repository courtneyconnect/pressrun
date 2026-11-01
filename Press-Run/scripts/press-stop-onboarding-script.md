# Press Run · Press Stop onboarding text script

Version 3 · 2026-11-01 · Milestone M1

This is every message Press Run sends a new **Press Stop** (street series, podcast, radio show, livestream, YouTube show, photographer) in iMessage. It ends with Press Run sending the Press Stop its **card and clip** to approve. Every message Press Run sends says **Press Stop**. The notes here say "stop" only as shorthand. The step IDs (S1, S2…) match the build plan and the mockup.

The format and the global rules are the same as the booker script. **Section 0 of `booker-onboarding-script.md` applies here too** (STOP, HELP, human, back, skip, start over, mid-flow questions, voice notes, nudges, "ask again once, then save as `needs_review`").

The stop answers **10 things in 6 short rounds**: series name, format, audience and platforms, cities, filming schedule and open dates, what a booker gets, rate, notice needed, who handles bookings, and 3 sample links. Then comes a cover photo and approval.

---

## 1. Entry

| Case | Starts at |
| --- | --- |
| Website sign-up code for a stop: `Hey Press Run 👋 List my show. Code PR-2M8D` | S1 |
| Booker answered YES to "do you also run a show?" (booker B8) | S1, skipping the welcome and Member number (already given) |
| No code, picked "2" at booker B0 | S0a |

### S0a · Name and email (no website sign-up only)

```
PR: Love it. What's your name and email? (Email is only for booking confirmations and payouts later.)
```

Same rules as booker B0a. → S1

---

## 2. Onboarding questions

### S1 · Welcome, series name and format

```
PR: Welcome to Press Run, {first_name}. You're Member #{member_no} 🎟️ Since you're one of the first 1,000 members, Press Run takes NO service fees from your bookings for 12 months after they start. You always set your own rate.

PR: I'll ask a few questions, then I'll make your Press Stop card and a short sample clip. That's what bookers see. Takes about 5 minutes.

PR: What's your show called, and what's the format?
1 Street interview / street series
2 Podcast
3 Radio
4 Livestream
5 YouTube show
6 Photo or video shoot
7 Something else
```

- **Accept:** a name plus a number or format word (`street`, `pod`, `IG live`, `Twitch`, `radio`, `shoot`). Several formats (`podcast, also on YouTube`) → main format first, others saved as extras.
- **Name only:** `PR: Great name. Which format is it? Reply 1–7.`
- **Format only:** `PR: And what's it called?`
- **Several shows** (`I have 3 series`): `PR: Let's do one at a time. Which first? Text "add another show" when we're done to list the next one.` Each show gets its own card.
- → S2

### S2 · Audience and platforms

```
PR: Where does {series} post, and roughly how many followers on each? Type the @handle or paste the profile link, e.g. "IG @musicforaminute 85k" or "tiktok.com/@musicforaminute 210k"
```

- **Accept:** each platform as a handle **or** a profile link, plus a follower count in any format (`85k`, `85,000`, `1.2M`). Handles and links follow **Handles and profile links** in section 0 of the booker script.
- **Platforms with no numbers:** `PR: Roughly how many followers on {platform}? A ballpark is fine.`
- **Numbers with no handle or link:** `PR: What's the @handle or profile link for {platform}? I use it to check the numbers.`
- **Vague answer** (`big`, `growing`): `PR: Ballpark per platform is perfect, e.g. "IG ~10k". Bookers filter by it.`
- **Accuracy:** numbers are self-reported. They're saved with `audience_verified = false`, and Courtney spot-checks the profile links before the stop goes live. The card shows the **total, rounded** (e.g. "Audience 307K").
- → S3

### S3 · Where and when you film

```
PR: Where do you film, and when? e.g. "Manhattan, mostly SoHo and Washington Sq, Thu–Sat afternoons"

PR: And which dates are open in the next 4 weeks? e.g. "Nov 12, 14, 15" or "any Thu or Sat"
```

- **Accept:**
  - **Places:** city, borough, neighborhood, studio address, or `remote` (podcast or livestream guests can call in). Outside NYC → `PR: Got it. Bookers outside {city} won't see you yet. I'll text you when we launch there.` The stop is still saved.
  - **Schedule:** days and times in plain words.
  - **Open dates:** specific dates, weekdays, or `flexible`.
- **"whenever" or "flexible":** `PR: Easy, I'll mark you flexible and check with you on each request.` The card then shows "Open: flexible".
- **Past dates:** they're dropped. `PR: Nov 3 has already passed, so I left it off.`
- Every Monday, Press Run asks: `PR: Quick calendar check for {series}: still open {dates}? Reply "yes" or send new dates.`
- → S4

### S4 · What a booker gets and rate

```
PR: What does a booker get from one appearance? e.g. "60-sec street interview, posted on IG + TikTok, raw clip shared after"

PR: And what's your rate for one appearance? Reply "free", an amount, or a range like "$300–500". It's yours to set.
```

- **Accept:**
  - **Deliverable:** any text, tagged with length, platforms and extras (raw footage, collab post, sound).
  - **Price:** `free`, a number, a range, or `depends`.
- **`depends`:** `PR: Give me a starting rate so bookers can filter, e.g. "from $250". You can always quote higher per request.`
- **Free plus paid** (`free for new artists, $500 for labels`): saved as two tiers, with the lower one on the card. `PR: Got it. I'll show "Free–$500" and send you each request to decide.`
- **Fee check:** `PR: Heads up: Press Run is free right now. Once payments go live, it takes a 10% service fee from paid bookings (none for you for the first 12 months), and I'll always show what you take home.`
- → S5

### S5 · Notice needed and who handles bookings

```
PR: How much notice do you need before a shoot? e.g. "48 hours" or "1 week"

PR: When a booking request comes in, should I text you here, or someone on your team? (Bookers never see your number either way.)
```

- **Accept:**
  - **Notice:** hours, days or weeks (`2 days`, `a week`, `same day ok`).
  - **Contact:** `me` or `here` saves this thread. `my producer Dee 917…` saves a teammate. Press Run texts them once: `PR: Hi Dee, {first_name} added you to handle bookings for {series} on Press Run. Reply OK to confirm.` That message is only sent with the stop's okay in this step. If the teammate doesn't reply, requests keep going to the stop.
- **If unclear about the contact:** `PR: Just reply "me", or a name and number.`
- → S6

### S6 · Three sample links

```
PR: Last step: send 3 links to episodes you're proud of (IG, TikTok, YouTube, anywhere). I'll cut a 15–20 sec sample clip from them.

PR: Or attach the videos right here if that's easier.
```

- **Accept:** up to 5 links or video attachments. Fewer than 3 is fine: `PR: 1 is enough to start. Send more anytime to improve your clip.`
- **Link can't be read** (private, deleted, or the platform blocks downloads): `PR: I couldn't open that one ({link}). Is it private? You can also attach the video here.`
- **Not a video** (a profile link): `PR: That's your profile. Can you send links to 1–3 specific episodes?`
- **Rights check:** `PR: Just confirming: you own these, or have permission to share them? Reply YES.` Tapbacks 👍 or ❤️ count as yes. **No** → `PR: No problem. Send ones you own, or attach your own video.`
- → S7

### S7 · Cover image

```
PR: For your card's cover, send a photo or logo. Or reply "use a frame" and I'll grab one from your episodes.
```

- **Accept:** an image attachment, or `use a frame`, `you pick` or `whatever`, which all mean Press Run picks a frame.
- **Too small or blurry** (under 600 px on its short side): `PR: That one's a little small and will look blurry. Got a bigger version? Or reply "use a frame".`
- → S8

### S8 · Building (wait message)

```
PR: Perfect. Making your card and sample clip now 🎬 This takes a few minutes. I'll text you when they're ready.
```

Behind the scenes: download the samples, pick the clip, render the card, render the clip (see the build plan). If it takes longer than 10 minutes: `PR: Still working on your clip. Almost there.` If it fails: `PR: I hit a snag making your clip. Courtney will finish it by hand and text you today.` The thread is flagged for a human.

---

## 3. Approval

### S9 · Card and clip to approve

```
PR: Here's how bookers will see {series} 👇

PR: [card image]

PR: [sample clip, 0:18]

PR: Reply "looks good" (or ❤️ either one) to go live. Or tell me what to change, e.g. "rate 300–500", "use the 2nd episode", "new cover", "open dates Nov 20, 22".
```

The card shows these fields, top to bottom:

| Card field | Comes from | Example |
| --- | --- | --- |
| Number badge | Filled in when the card is sent to a booker. Shows `#` in the preview | `1` |
| Cover image | S7 | photo |
| Series name | S1 | Music for a Minute |
| Format · area | S1, S3 | Street interview · Manhattan |
| Audience | S2 total, rounded | 307K followers |
| Rate | S4 | Free–$500 |
| Open dates | S3, next 3 | Open Nov 12 · 14 · 15 |
| Reply line | fixed | Reply 1 or ❤️ to save |

### S10 · Changes

| Stop says | Press Run does |
| --- | --- |
| `looks good`, `perfect`, `approve`, `yes`, ❤️ 👍 🔥 💯 on the card or clip | → S11 |
| A field change (`rate 300-500`, `audience IG 90k`) | Updates the field, re-renders the card only, and sends it again with `PR: Updated 👇`. |
| `use the 2nd episode`, `different part`, `start at 0:40` | Re-cuts the clip and sends it again. |
| `new cover` + image | Re-renders the card. |
| 👎 on the card or clip | `PR: What should I change about the {card/clip}?` |
| ❓ | `PR: The card is what bookers see in a list. The clip plays right under it. Want to change anything?` |
| Three rounds of changes and still not right | `PR: Let me get Courtney to make this perfect. She'll text you today.` Flagged for a human. |

### S11 · Live

```
PR: You're live as a Press Stop ✅ Bookers in NYC can now find {series}.

PR: When a request comes in, I'll text you here with who, when and the budget. Just reply YES with a time, NO to pass, or ask a question and I'll pass it on.

PR: [contact card: Press Run]
PR: Save me so booking texts show up as Press Run.
```

Then, if the stop hasn't been asked yet:

```
PR: Do you ever book guests on other shows, or go on press runs yourself? Reply YES to turn on booking too.
```

`yes` → booker script B1 (role question), keeping the name and email.

---

## 4. Messages Press Run sends a live Press Stop

| When | Message |
| --- | --- |
| New request | `PR: 📩 New booking request #{id}` + booker name, niche, handles, dates, budget. `Reply YES with a day and time, NO to pass, or type a question and I'll pass it on.` |
| No reply in 12 hours | `PR: Nova Reign's team is waiting on #{id}. YES with a time, or NO?` |
| No reply in 24 hours | The request is marked expired. The booker is told and offered a different Press Stop. |
| Booking confirmed | `PR: Booked ✅ {booker} · {date} {time} · {place}. I'll send reminders.` |
| Night before / 1 hour before | Same as for bookers, with the talent's name. |
| After the shoot | `PR: Once it's posted, send me the link and I'll pass it to {booker} for their recap.` |

---

## 5. Data saved per Press Stop

`series_name`, `format`, `formats_extra[]`, `platforms[]` (platform, handle, url, followers), `audience_total`, `audience_verified`, `cities[]`, `neighborhoods[]`, `remote_ok`, `schedule_text`, `open_dates[]`, `flexible`, `deliverable_text`, `deliverable_tags[]`, `price_low`, `price_high`, `price_tiers[]`, `notice_hours`, `booking_contact` (self or a teammate's phone), `sample_links[]`, `rights_confirmed`, `cover_image`, `card_url`, `clip_url`, `card_version`, `status` (draft → building → pending_approval → live → paused), `member_no`, `owner_account_id`.

---

## 6. Courtney's own series (pilot, M2)

The four pilot Press Stops go through this exact script from Courtney's phone, one show at a time ("add another show"): Music for a Minute, Motivation for a Minute, Movies for a Minute, Penny for Your Thoughts. Doing it for real is the M2 task "List my series as the first Press Stops".

## 7. Open items for Courtney

- **Collab-post opt-in** (Marketing idea "A collab post on every booking"). It isn't decided yet, so it isn't in the script. If it's approved, add it as an optional S5 question: `PR: Would you post bookings as an IG collab with @pressrun? It helps both of you get seen. YES / NO / ask me each time.`
- Weekly calendar check on Mondays is a placeholder day.
