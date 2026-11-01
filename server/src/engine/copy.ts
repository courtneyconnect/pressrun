// Every message Press Run sends, word for word from the onboarding scripts
// (Press-Run/scripts/*.md). Change wording here, not in the flows.

import type { Out } from "../types";
import { interestList } from "./parse";

export const t = (text: string): Extract<Out, { type: "text" }> => ({ type: "text", text });

export const memberNo = (n: number) => "#" + String(n).padStart(4, "0");

const FOUNDING_LIMIT = 1000;

// ---------- Section 0: rules that apply at every step ----------

export const UNSUBSCRIBED = t("You're unsubscribed and won't get more texts. Text START anytime to come back.");
export const RESUBSCRIBED = t("Welcome back 👋");
export const HELP = t('I\'m Press Run. I book press runs by text. Text "menu" to see what I can do, or "human" to reach Courtney.');
export const HUMAN = t("Got it. Courtney from Press Run will text you in this thread soon (usually within a few hours, 10am–7pm ET).");
export const NEED_THIS = t("I need this one to match you with the right Press Stops. A rough answer is fine.");
export const STARTING_OVER = t("Starting over. Your earlier answers are cleared.");
export const VOICE_NOTE = t("I can't listen to voice notes yet. Mind typing that?");
export const GOT_IT = t("Got it 👍");
export const BACK_TO_IT = t("Back to where we were:");
export const NUDGE_24 = t("Still want to set up Press Run? Just answer the last question when you're ready.");
export const NUDGE_72 = t("I'll stop nudging. Text me anytime and we'll pick up where we left off.");

export const FAQ: { match: RegExp; answer: string }[] = [
  { match: /how much|cost|price|fees?|pay\b|charge/i, answer: "Free while we're in beta. After that, Press Run adds a service fee: 10% on paid bookings and $15 on free Press Stops. Press Stops set their own rates. As one of the first 1,000 members, you pay NO service fees for 12 months after they start." },
  { match: /who are you|is this a bot|are you (a )?(bot|real|human|ai)/i, answer: 'I\'m Press Run\'s booking assistant. A real person (Courtney) checks in on every booking. Text "human" anytime.' },
  { match: /their number|get (the|their|a) number|phone number/i, answer: "I keep numbers private by default. It keeps everyone safe from spam. If they want you to have it, they can reply SHARE and I'll pass it on." },
  { match: /info shared|my info|privacy|private/i, answer: "Press Stops only see what's on your request: name, niche, handles and dates. Never your number or email." },
  { match: /what cities|which cities|other cities|outside (nyc|new york)|\bla\b|atlanta|chicago/i, answer: "New York right now. More soon, and I'll text you when your city opens." },
  { match: /android/i, answer: "They can text this same number. It works over regular SMS too." },
];

// ---------- Entry ----------

export const WELCOME_BACK = (first?: string) =>
  t(`Welcome back${first ? `, ${first}` : ""}. Text a run anytime, like "NYC Dec 3–5, 1 artist, $2k".`);

export const B0 = [
  t("Hey, this is Press Run 👋 I book press runs by text: street series, podcasts, radio, livestreams and YouTube shows."),
  t("Are you here to 1 book press for yourself or someone else, or 2 list a show so people can book you? Reply 1, 2, or both."),
];
export const B0_UNCLEAR = t('Just reply 1 if you\'re booking press, 2 if you run a show, or "both".');

export const NAME_EMAIL_BOOKER = t("Nice. What's your name and email? (Email is only for receipts and your Run Sheets. No spam.)");
export const NAME_EMAIL_STOP = t("Love it. What's your name and email? (Email is only for booking confirmations and payouts later.)");
export const ASK_EMAIL = t("And your email?");
export const ASK_NAME = t("And what should I call you?");
export const BAD_EMAIL = t("That email doesn't look right. Mind checking it?");

// ---------- Booker onboarding ----------

export const B1_WELCOME = (first: string, no: number): Out =>
  no <= FOUNDING_LIMIT
    ? t(`Welcome to Press Run, ${first}. You're Member ${memberNo(no)} 🎟️ Since you're one of the first 1,000 members, you pay NO Press Run service fees for 12 months after they start. Press Stops set their own rates.`)
    : t(`Welcome to Press Run, ${first}. You're Member ${memberNo(no)} 🎟️`);
export const B1_INTRO = t("A few quick questions so I send you the right Press Stops. Takes about 2 minutes.");
export const B1_ROLE = t("First: who are you booking for?\n1 Yourself (artist, actor, creator)\n2 Artists or talent you manage\n3 A label, agency or PR firm\n4 A brand");
export const B1_UNCLEAR = t("No problem. Which is closest? 1 Yourself, 2 artists you manage, 3 a label/agency/PR firm, 4 a brand. You can change it later.");

export const B2_SELF = t('What name do you go by on posts? Add your @handle or paste a link to your profile, e.g. "Nova Reign @novareign" or "Nova Reign instagram.com/novareign"');
export const B2_SELF_NO_HANDLE = t('And your @handle or a link to your profile? Or reply "none" if you\'re just starting.');
export const B2_ROSTER = t("Who's on your roster? Send each artist's name with their @handle or a link to their profile, one per line. You can add more later.\ne.g.\nNova Reign @novareign\nJay Mo tiktok.com/@jaymo.nyc");
export const B2_ROSTER_MANY = (n: number) => t(`Got ${n} artists 🙌 I'll keep them all. When you book, just say who it's for.`);
export const B2_ROSTER_VAGUE = t('Send me the 3–5 you book most. You can add the rest anytime by texting "add artist".');
export const B2_ROSTER_NAMES = (handles: string[]) => t(`Got ${handles.join(" and ")}. What names do they go by?`);
export const B2_COMPANY = t("And what's the label, agency or firm called?");
export const B2_BRAND = t("What's the brand, and what are you hoping for?\n1 Product in the shot\n2 Someone from your team appears as a guest\n3 A sponsored segment\n4 Not sure yet");
export const B2_BRAND_GOAL = t("And which of the 4 fits best?\n1 Product in the shot\n2 Someone from your team appears as a guest\n3 A sponsored segment\n4 Not sure yet");
export const PLATFORM_FOR = (handle: string) => t(`Is ${handle} on Instagram, TikTok, or somewhere else?`);
export const POST_NOT_PROFILE = t("That looks like a post. Can you send the link to the profile, or just the @handle?");

export const B3 = (multiArtist: boolean) =>
  t('What genre or niche? A few words is perfect, e.g. "drill and R&B", "stand-up comedy", "indie film", "fitness".' + (multiArtist ? " If it's different per artist, put it next to each name." : ""));
export const B3_BRAND = t('What\'s the product category? e.g. "sneakers", "energy drink", "skincare".');
export const B3_UNCLEAR = t('Totally fine. What would someone hear or see first? e.g. "rap", "romcoms", "makeup tutorials".');

const B4_LIST = "1 Street interviews and street series\n2 Features and collabs with content creators (YouTube, IG, TikTok)\n3 Podcasts\n4 Radio\n5 Livestreams\n6 Open to anything";
export const B4 = (role?: string) =>
  role === "manager" || role === "label"
    ? t(`What kind of Press Stops do you want for your artists? Pick as many as you want.\n${B4_LIST}`)
    : role === "brand"
      ? t(`What kind of Press Stops fit your brand?\n${B4_LIST}`)
      : t(`What kind of Press Stops are you looking for? Pick as many as you want.\n${B4_LIST}`);
export const B4_UNCLEAR = t('Just pick the numbers that sound right, like "1 and 3". You can change it anytime.');

export const B4B = (who: "self" | "brand" | string, craft: string) =>
  who === "self"
    ? t(`What are you into outside of ${craft}? Pick as many as you want, or tell me others.\n${interestList(false)}`)
    : who === "brand"
      ? t(`What's your audience into? Pick as many as you want.\n${interestList(false)}`)
      : t(`What's ${who} into outside of ${craft}? Pick as many as you want, or tell me others.\n${interestList(false)}`);
export const B4B_NEXT = (name: string) => t(`And ${name}?`);
export const B4B_UNCLEAR = t('Any hobbies or things they geek out about? Even one helps, e.g. "gaming" or "sneakers".');

export const B5 = t("What do you usually spend on a full run? (Booking through Press Run is free right now. This just helps me match you.)\n1 Free Press Stops only\n2 Under $1k\n3 $1k–$5k\n4 $5k+\n5 Depends on the run");
export const B5_UNCLEAR = t("Ballpark is fine. Closer to free, under $1k, or more?");

export const B6 = t('Any Press Stops you\'d never do? e.g. "no prank shows", "nothing explicit", "no mornings". Or reply "none".');

export const B7 = t("Last one: where are you based? We're live in New York first, with more cities soon.");
export const B7_NYC = t("NYC 🗽 perfect.");
export const B7_ELSEWHERE = (city: string) => t(`Got it. Right now I only have New York Press Stops, so I'm best for runs in NYC. I'll text you when ${city} opens up.`);

export const B8_SUMMARY = (first: string, lines: string[]) =>
  t(`You're set, ${first} ✅\n${lines.map(l => "• " + l).join("\n")}\nReply "edit" to change anything.`);
export const CONTACT_CARD: Out = { type: "contact" };
export const SAVE_ME = t("Save me so my texts show up as Press Run.");
export const B8_BOTH = t("Quick one: do you also run a show, series or podcast people could book? Reply YES to list it as a Press Stop too. Same thread, same account.");
export const B8_LATER = t("No rush. Text “list my show” anytime and we'll set it up in this same thread.");

export const B9 = [
  t('Here\'s how it works. Text me a run anytime, like:\n"NYC Nov 12–15, 2 artists, $5k budget, give me my options"'),
  t('I\'ll send numbered Press Stops, each with a card and a short clip. Pick by replying ("1 and 3") or by reacting:\n❤️ 👍 🔥 💯 save it\n👎 drop it and show fewer like it\n❓ tell me more'),
];
export const B9_RELEASE = (what: string, date: string) => t(`You mentioned ${what} on ${date}. Want me to pull options for that week? Reply YES.`);

// ---------- Press Stop onboarding ----------

export const S1_WELCOME = (first: string, no: number): Out =>
  no <= FOUNDING_LIMIT
    ? t(`Welcome to Press Run, ${first}. You're Member ${memberNo(no)} 🎟️ Since you're one of the first 1,000 members, Press Run takes NO service fees from your bookings for 12 months after they start. You always set your own rate.`)
    : t(`Welcome to Press Run, ${first}. You're Member ${memberNo(no)} 🎟️ You always set your own rate.`);
export const S1_EXISTING = (no: number) => t(`Love it. You're already Member ${memberNo(no)}, so I'll skip the basics.`);
export const S1_INTRO = t("I'll ask a few questions, then I'll make your Press Stop card and a short sample clip. That's what bookers see. Takes about 5 minutes.");
export const S1_Q = t("What's your show called, and what's the format?\n1 Street interview / street series\n2 Podcast\n3 Radio\n4 Livestream\n5 YouTube show\n6 Photo or video shoot\n7 Something else");
export const S1_NAME_ONLY = t("Great name. Which format is it? Reply 1–7.");
export const S1_FORMAT_ONLY = t("And what's it called?");
export const S1_SEVERAL = t('Let\'s do one at a time. Which first? Text "add another show" when we\'re done to list the next one.');
export const S1_SEVERAL_NAMED = (name: string) => t(`Let's do one at a time, starting with ${name}. Text “add another show” when we're done to list the next one.`);
export const S1_CREATOR = (first: string) => t(`And you're the creator bookers will meet, ${first}? Reply YES, or send the host's name.`);

export const S2 = (series: string) => t(`Where does ${series} post, and roughly how many followers on each? Type the @handle or paste the profile link, e.g. “IG @musicforaminute 85k” or “tiktok.com/@musicforaminute 210k”`);
export const S2_NO_NUMBERS = (platform: string) => t(`Roughly how many followers on ${platform}? A ballpark is fine.`);
export const S2_NO_HANDLE = (platform: string) => t(`What's the @handle or profile link for ${platform}? I use it to check the numbers.`);
export const S2_VAGUE = t('Ballpark per platform is perfect, e.g. "IG ~10k". Bookers filter by it.');

export const S2B = (series: string) => t(`Which interests does ${series} cover? Pick any, or reply “general” if it features anyone.\n${interestList(true)}`);
export const S2B_UNCLEAR = t('Think about who your guests usually are or what your episodes are about. "Movies" or "general" is plenty.');

export const S3_WHERE = t('Where do you film, and when? e.g. "Manhattan, mostly SoHo and Washington Sq, Thu–Sat afternoons"');
export const S3_DATES = t('And which dates are open in the next 4 weeks? e.g. "Nov 12, 14, 15" or "any Thu or Sat"');
export const S3_FLEXIBLE = t("Easy, I'll mark you flexible and check with you on each request.");
export const S3_PAST = (dates: string) => t(`${dates} ${dates.includes(",") ? "have" : "has"} already passed, so I left ${dates.includes(",") ? "them" : "it"} off.`);
export const S3_OUTSIDE = (city: string) => t(`Got it. Bookers outside ${city} won't see you yet. I'll text you when we launch there.`);

export const S4_WHAT = t('What does a booker get from one appearance? e.g. "60-sec street interview, posted on IG + TikTok, raw clip shared after"');
export const S4_RATE = t('And what\'s your rate for one appearance? Reply "free", an amount, or a range like "$300–500". It\'s yours to set.');
export const S4_DEPENDS = t('Give me a starting rate so bookers can filter, e.g. "from $250". You can always quote higher per request.');
export const S4_FEE_NOTE = t("Heads up: Press Run is free right now. Once payments go live, it takes a 10% service fee from paid bookings (none for you for the first 12 months), and I'll always show what you take home.");

export const S5_NOTICE = t('How much notice do you need before a shoot? e.g. "48 hours" or "1 week"');
export const S5_CONTACT = t("When a booking request comes in, should I text you here, or someone on your team? (Bookers never see your number either way.)");
export const S5_CONTACT_UNCLEAR = t('Just reply "me", or a name and number.');
export const S5_TEAMMATE_OK = t("Got it. I'll text that number once to confirm. Bookers never see it.");

export const S5B = t("Would you post bookings as an Instagram collab with @pressrun? It helps both of you get seen. Reply YES, NO, or ASK (I'll check with you each time).");

export const S6 = [
  t("Last step: send an episode you're proud of, straight from your camera roll. I'll use the first 18 seconds as your preview clip. (Tip: trim it in Photos first if you want a different 18 seconds.)"),
  t("Then send the link to the full episode on your channel, so bookers can watch the whole thing."),
];
export const S6_VIDEO_ONLY = t('Got it 🎬 And the link to the full episode? Or reply "skip".');
export const S6_LINK_ONLY = t("Got the link 👍 Now attach the video from your camera roll for the 18-second preview.");
export const S6_PROFILE_LINK = t("That's your profile. Can you send the link to that episode?");
export const S6_RESEND = t("I couldn't open that video. Mind sending it again?");
export const S6_RIGHTS = t("Just confirming: you own these, or have permission to share them? Reply YES.");
export const S6_RIGHTS_NO = t("No problem. Send one you own.");

export const S7 = t('For your card\'s cover, send a photo or logo. Or reply "use a frame" and I\'ll grab one from your episodes.');
export const S8 = t("Perfect. Making your card and sample clip now 🎬 This takes a few minutes. I'll text you when they're ready.");
export const S8_STILL = t("Still working on your clip. Almost there.");
export const S8_SNAG = t("I hit a snag making your clip. Courtney will finish it by hand and text you today.");

// ---------- Approval (S9–S11) ----------

export const S9_HERE = (series: string) => t(`Here's how bookers will see ${series} 👇`);
export const S9_REPLY = t('Reply "looks good" (or ❤️ either one) to go live. Or tell me what to change, e.g. "rate 300–500", "use the 2nd episode", "new cover", "open dates Nov 20, 22".');
export const S10_UPDATED = t("Updated 👇");
export const S10_WHAT = (what: "card" | "clip") => t(`What should I change about the ${what}?`);
export const S10_EXPLAIN = t("The card is what bookers see in a list. The clip plays right under it. Want to change anything?");
export const S10_HUMAN = t("Let me get Courtney to make this perfect. She'll text you today.");
export const S10_UNCLEAR = t('Reply "looks good" to go live, or tell me what to change, e.g. "rate 300–500", "use the 2nd episode", "new cover".');
export const S10_SEND_COVER = t("Send the new cover photo or logo here.");

export const S11 = (series: string): Out[] => [
  t(`You're live as a Press Stop ✅ Bookers in NYC can now find ${series}.`),
  t("When a request comes in, I'll text you here with who, when and the budget. Just reply YES with a day/time/location, NO to pass, or ask a question and I'll pass it on."),
  { type: "contact" },
  t("Save me so booking texts show up as Press Run."),
];
export const S11_ANOTHER = t("Want to list your next show? Text “add another show”.");
export const S12_BOOKING = t("Do you ever book guests on other shows, or go on press runs yourself? Reply YES to turn on booking too.");

// ---------- Asking for a run (R1–R3) ----------

export const R_DATES = t('Which dates? e.g. "Nov 12–15" or "next week".');
export const R_CITY = t("Which city? Right now I've got New York.");
export const R_WHO = (names: string) => t(`For who: ${names}, or all?`);
export const R_USING_BUDGET = (budget: string) => t(`Using your usual ${budget} budget.`);
export const R_PAST = (date: string) => t(`${date} has already passed. Did you mean next year, or another date?`);
export const R_CITY_NOT_LIVE = (city: string) => t(`I don't have Press Stops in ${city} yet, but I'll text you when it opens. Want options in NYC instead?`);
export const R_CITY_LATER = (city: string) => t(`Got it. I'll text you when ${city} opens.`);
export const R_DATES_LATER = t("No problem. Text me the dates whenever you're ready.");
export const R_ON_IT = (summary: string) => t(`On it: ${summary}. Pulling Press Stops now…`);
export const R_SUMMARY = (n: number, total: string, matchLine: string) =>
  t(`That's ${n} Press Stops, ${total}. ${matchLine}Reply with numbers ("1 and 3"), react to a card, or ask "cheaper", "more like 2", or "who's free Thursday?"`);
export const R_FEW = (n: number, cap: number) => t(`Only ${n} Press Stop${n === 1 ? "" : "s"} fit${n === 1 ? "s" : ""} those dates and budget. Want me to widen the dates or include paid Press Stops up to $${cap}?`);
export const R_NONE = t("No Press Stops fit those dates and budget yet. Want me to widen the dates or include paid Press Stops?");
export const R_LIST_INTRO = (n: number) => t(`${n} Press Stops fit 🔥 Here's the full list 👇`);
export const R_LIST_HOW = t('Reply with the numbers you want to see ("2, 5, 9"), or "show me all", and I\'ll send their cards and clips. You can also say "only podcasts", "under $300" or "Thursday only".');
export const R_LIST_MORE = t('Reply "more" for the rest.');
export const R_LIST_Q = t('Reply with numbers to see cards, or "show me all".');
export const R_PAGE = (a: number, b: number) => t(`That's ${a}–${b}. Reply "more" for the next 5.`);
export const R_SHORTLISTED = (nums: string, who: string) => t(`Shortlisted ${nums}, ${who}. Want me to ask about dates?`);
export const R_SHORTLIST = (nums: string) => t(`Shortlist: ${nums} ✅`);
export const R_DROPPED = (n: number) => t(`Dropped ${n}. I'll show fewer like it.`);
export const R_FULL = (who: string) => t(`Here's the full episode from ${who} 👇`);
export const R_NO_FULL = (who: string) => t(`${who} hasn't added a full episode yet. Want me to ask?`);
export const R_ONLY_SENT = (a: number, b: number) => t(`I only sent ${a}–${b}. Which ones?`);
export const R_CHEAPER = t("Cheaper options 👇");
export const R_CHEAPEST = t("These are the cheapest I've got for those dates.");
export const R_MORE_LIKE = (n: number) => t(`More like ${n} 👇`);
export const R_NO_MORE_LIKE = (n: number) => t(`That's everyone like ${n} for those dates.`);
export const R_FREE_ON = (day: string, nums: string, who: string) => t(`${day}: ${nums} (${who}).`);
export const R_ALSO_FREE = (day: string) => t(`Also free ${day} 👇`);
export const R_NOBODY_ELSE = (day: string) => t(`Nobody else is free ${day}.`);
/** Build-slice note: asking Press Stops (R4) is the next slice. */

// ---------- Passing messages and booking (R4–R5) ----------

export const R_ASK_WHICH = t("Which ones? Reply with numbers, or ❤️ a card first.");
export const R_SENT = (who: string, dates: string) => t(`Sent 🙌 I asked ${who} about ${dates}. I'll pass their replies here, usually within a few hours.`);
export const REQ_HEAD = (code: string, talentLine: string, series: string, dates: string, budget: string) =>
  t(`📩 New booking request #${code}\n${talentLine} for ${series}\nDates: ${dates} · ${budget}`);
export const REQ_REPLY = t("Reply YES with a day/time/location, NO to pass, or type a question and I'll pass it on.");
export const RELAY = (label: string, words: string) => t(`💬 ${label}: ${words}`);
export const RELAY_LOCK_HINT = t('Reply to answer, or "lock it" to book that time.');
export const SENT_TO = (label: string) => t(`Sent to ${label} ✅`);
export const ASK_DETAILS = t('What day, time and place work? e.g. "Thu Nov 13, 2:30pm, Washington Sq Park"');
export const STOP_PASS_OK = t("No worries, I'll let them know.");
export const BOOKER_PASSED = (who: string) => t(`${who} can't make those dates. Want me to ask someone else?`);
export const NO_TIME_YET = (who: string) => t(`${who} hasn't suggested a time yet. I'll pass it on when they do.`);
export const WHICH_CONV = (a: string, b: string) => t(`Is this for ${a} or ${b}?`);
export const BOOKED_BOOKER = (who: string, when: string, place: string) => t(`Booked ✅ ${who} · ${when} · ${place}`);
export const RUNSHEET_SOON = t("I'll send your full Run Sheet once the other Press Stops confirm.");
export const BOOKED_STOP = (talent: string, when: string, place: string) => t(`Booked ✅ ${talent} · ${when} · ${place}. I'll send reminders.`);
export const STOP_CAL = t("Tap the calendar file to add it to your calendar.");
export const HID_NUMBER = (who: string) => t(`I hid your number in what I passed on. Reply SHARE if you want ${who} to have it.`);
export const SHARED = (who: string) => t(`Shared ✅ ${who} can see your number now.`);
export const SHARED_OTHER = (label: string, value: string) => t(`📞 ${label} shared their number: ${value}`);
export const NOTHING_TO_SHARE = t("There's no hidden number to share right now.");
export const STOP_NUDGE = (label: string, code: string) => t(`${label} is waiting on #${code}. YES with a day/time/location, or NO?`);
export const BOOKER_EXPIRED = (who: string) => t(`${who} didn't get back in time. Want me to ask someone else?`);
export const STOP_EXPIRED = (code: string) => t(`#${code} expired. No worries.`);
export const RUNSHEET_TEXT = (n: number, range: string) => t(`Your run: ${n} Press Stop${n === 1 ? "" : "s"}, ${range}. I'll text call times the night before and 1 hour before each one. Reply "change" if anything moves.`);
export const RUNSHEET_CAL = t("Tap the calendar file to add every stop to your calendar in one go.");
export const REMIND_NIGHT_BOOKER = (who: string, time: string, place: string) => t(`Tomorrow: ${who} at ${time}, ${place}. Reply "late" if you're running behind.`);
export const REMIND_NIGHT_STOP = (talent: string, time: string, place: string) => t(`Tomorrow: ${talent} at ${time}, ${place}.`);
export const REMIND_HOUR_BOOKER = (who: string, place: string) => t(`${who} in 1 hour 📍 ${place}`);
export const REMIND_HOUR_STOP = (talent: string, place: string) => t(`${talent} in 1 hour 📍 ${place}`);
export const LATE_TOLD = (who: string) => t(`Told ${who}. You're good 👍`);

// ---------- After the shoot (booker script section 4, Press Stop script section 4) ----------

export const WRAP_STOP = (talent: string) => t(`Great shoot today 🎬 When the edit's ready, send the video here. I'll get ${talent}'s team to OK it before it goes live.`);
export const EDIT_NUDGE_3D = (talent: string) => t(`How's the ${talent} edit coming? Send it here when it's ready.`);
export const EDIT_NUDGE_7D = (talent: string) => t(`Last check-in on the ${talent} edit 🙏 Send it here when it's ready, or tell me if something came up.`);
export const EDIT_GOT = (talent: string) => t(`Got it ✅ Sending it to ${talent}'s team for their OK.`);
export const EDIT_TO_BOOKER = (who: string) => t(`${who} sent the edit for your OK 👇`);
export const EDIT_HOW = t("❤️ it to approve, or reply with changes and I'll pass them on.");
export const EDIT_APPROVED_BOOKER = (creator: string) => t(`Approved ✅ I'll let ${creator} know they can post.`);
export const EDIT_APPROVED_STOP = (talent: string) => t(`Approved ✅ ${talent}'s team loves it. Post when you're ready, then drop the live link here.`);
export const COLLAB_REMIND = (talent: string, handle?: string) => t(`Remember to add ${talent}${handle ? ` (${handle})` : ""} as a collaborator so it lands on their page too 🙌`);
export const COLLAB_YES = t("And feel free to tag @pressrun too if you'd like.");
export const COLLAB_ASK = t("Want to add @pressrun as a collaborator too? Totally optional.");
export const EDIT_WHAT_CHANGE = (creator: string) => t(`What should ${creator} change?`);
export const EDIT_SEND_NEW = t("Send the new version here when it's ready.");
export const EDIT_NUDGE_BOOKER = (creator: string) => t(`${creator} is waiting on your OK for the edit 👆 ❤️ it to approve, or reply with changes.`);
export const POST_GOT = t("Got it ✅ Passing it on. I'll check the views again in 7 days.");
export const POST_IG = t("Instagram keeps views private. Mind sending a screenshot of the insights in 7 days?");
export const POSTED_BOOKER = (who: string, views?: number) => t(views ? `${who} posted 🎬 ${fmtViews(views)} views so far.` : `${who} posted 🎬`);
export const VIEWS_ASK = (talent: string) => t(`It's been a week since the ${talent} post went up 📈 How many views is it at? A number or a screenshot of the insights works.`);
export const VIEWS_THANKS = t("Thanks ✅ Added to the recap.");
export const RATE_ASK = (who: string) => t(`How was your shoot with ${who}? Reply 1–5. (Ratings only count Press Run bookings.)`);
export const RATE_THANKS = t("Thanks 🙏 Saved.");
export const RECAP_INTRO = t("Every Press Stop has posted 🎉 Here's your recap 👇");
export const RECAP_INTRO_SO_FAR = t("Here's your recap so far 👇");
export const RECAP_TOTAL = (total: number, n: number) => t(`${fmtViews(total)} views across ${n} post${n === 1 ? "" : "s"}. Want to plan the next run? Text me dates anytime.`);

/** 1234 → "1,234"; 48200 → "48.2K"; 1250000 → "1.25M" */
export function fmtViews(n: number): string {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}
