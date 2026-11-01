// Shared shapes for messages, accounts, profiles and Press Stops.

/** One bubble Press Run sends. */
export type Out =
  | { type: "text"; text: string; ref?: string }
  | { type: "image"; url: string; alt: string; ref?: string }
  | { type: "video"; url: string; alt: string; ref?: string }
  | { type: "contact" }
  | { type: "link"; url: string }
  | { type: "file"; url: string; name: string; mime: string; ref?: string };

/** One message (or reaction) a person sends to Press Run. */
export interface Inbound {
  phone: string;
  text: string;
  media?: { kind: "image" | "video" | "audio" | "other"; url: string }[];
  reaction?: { emoji: string; targetProviderId: string; removed: boolean };
  providerId?: string;
  replyToProviderId?: string;
}

export interface Handle {
  platform?: string;
  handle?: string;
  url?: string;
}

export type Flow = "booker" | "stop" | "run";

export interface FlowState {
  retries: Record<string, number>;
  history: string[];
  /** After the booker flow ends, continue into the Press Stop flow. */
  then?: Flow | null;
  stopId?: string;
  requestId?: string;
  talentIdx?: number;
  /** The second half of a two-part question (e.g. S3 dates after places). */
  pending?: string | null;
  /** Follow-up questions already asked in this step, so none is asked twice. */
  asked?: string[];
  nudges?: number;
}

export interface Account {
  id: string;
  phone: string;
  memberNo: number;
  firstName?: string;
  email?: string;
  roles: string[];
  optedOut: boolean;
  flow: Flow | null;
  step: string | null;
  state: FlowState;
  needsHuman: boolean;
  needsReview: { step: string; text: string; at: string }[];
  lastInboundAt?: string;
  createdAt: string;
}

export interface SignupCode {
  code: string;
  name?: string;
  email?: string;
  intent: "booker" | "stop" | "both";
  claimedBy?: string;
}

export interface BookerProfile {
  role?: "self" | "manager" | "label" | "brand";
  extraRoles: string[];
  company?: string;
  brandName?: string;
  brandGoal?: string;
  selfName?: string;
  handles: Handle[];
  nicheText?: string;
  nicheTags: string[];
  stopTypes: string[];
  upcomingRelease?: { text: string; date?: string };
  budgetLow?: number;
  budgetHigh?: number;
  budgetText?: string;
  hardNos: string[];
  hardNoNotes?: string;
  /** Press Stop formats the booker 👎'd: "show fewer like it". */
  fewerFormats?: string[];
  city?: string;
  waitlistCity?: string;
  /** Interests for a self-booker, or a brand's audience. */
  interests: string[];
}

export interface Talent {
  id: string;
  bookerId: string;
  name: string;
  handles: Handle[];
  nicheText?: string;
  interests: string[];
}

export interface RunOption {
  number: number;
  stopId: string;
  /** listed = on the master list only; sent = card and clip sent. */
  state: "listed" | "sent" | "shortlisted" | "dropped";
  score: number;
  /** e.g. "Nova (🎬 Movies & TV)" when it's an interest match. */
  why?: string;
}

/** "NYC Nov 12–15, 2 artists, $5k budget": one booker asking for options. */
export interface RunRequest {
  id: string;
  bookerId: string;
  status: "draft" | "open" | "asked" | "closed";
  rawText: string;
  city?: string;
  start?: string;
  end?: string;
  talentIds: string[];
  budgetMax?: number;
  budgetText?: string;
  /** Narrowing the booker asked for: "podcasts only", "Thursday", "under $300". */
  only: { types?: string[]; weekdays?: number[]; maxRate?: number };
  mode?: "cards" | "list";
  options: RunOption[];
  nextNumber: number;
  /** A date they gave that had already passed, to ask about. */
  pastDate?: string;
  /** Manager with 2+ artists who didn't say who it's for. */
  needWho?: boolean;
  /** True when the budget came from onboarding, so Press Run says so. */
  usualBudget?: boolean;
  /** Where "show me all" / "more" left off on the master list. */
  cursor?: number;
  lastReactionAt?: string;
  /** When the Run Sheet went out (it goes again if a time changes). */
  runSheetSentAt?: string;
  recapSentAt?: string;
  createdAt: string;
}

/** One booker ↔ Press Stop pair (#PR-1042). Press Run passes messages between them. */
export interface Conversation {
  id: string;
  code: string;
  requestId: string;
  bookerId: string;
  stopId: string;
  /** Who answers for the Press Stop: the owner, or a teammate from S5. */
  contactId: string;
  talentIds: string[];
  status: "asked" | "talking" | "booked" | "declined" | "expired";
  proposal?: { date?: string; time?: string; place?: string };
  /** Shoot start in UTC, once booked. */
  shootAt?: string;
  /** Numbers or emails hidden from a relayed message, waiting for SHARE. */
  hidden: { booker: string[]; stop: string[] };
  lastToBookerAt?: string;
  lastToStopAt?: string;
  /** After the shoot: the edit for review, the live link and its views (section 4 of both scripts). */
  post?: {
    stage: "waiting_edit" | "in_review" | "approved" | "posted";
    edits: string[];
    /** The booker 👎'd the edit; their next text is the change. */
    awaitingChange?: boolean;
    reviewSentAt?: string;
    postUrl?: string;
    postedAt?: string;
    views?: number;
    viewsAskedAt?: string;
    viewsScreenshot?: string;
  };
  rating?: number;
  ratingAskedAt?: string;
  createdAt: string;
}

export interface PlatformEntry {
  platform?: string;
  handle?: string;
  url?: string;
  followers?: number;
}

export type StopStatus = "draft" | "building" | "pending_approval" | "live" | "paused";

export interface PressStop {
  id: string;
  ownerId: string;
  status: StopStatus;
  seriesName?: string;
  creatorNames: string[];
  format?: string;
  formatsExtra: string[];
  platforms: PlatformEntry[];
  audienceTotal?: number;
  audienceVerified: boolean;
  interests: string[];
  general: boolean;
  placesText?: string;
  remoteOk: boolean;
  outsideNyc?: boolean;
  openDates: string[];
  openText?: string;
  flexible: boolean;
  deliverableText?: string;
  rateLow?: number;
  rateHigh?: number;
  rateText?: string;
  noticeHours?: number;
  bookingContact?: { self: true } | { self: false; name?: string; phone: string };
  collab?: "yes" | "no" | "ask";
  /** Videos attached from the camera roll; the preview is the first 18 seconds of one. */
  samples: { url?: string; mediaUrl?: string }[];
  /** Links to the full episodes, for bookers who ask to watch the whole thing. */
  fullEpisodeLinks: string[];
  rightsConfirmed: boolean;
  cover?: "frame" | string;
  /** The two files Press Run makes, and how the clip was cut. */
  media?: { cardUrl?: string; clipUrl?: string; coverKey?: string; clipStart?: number; episode?: number; version: number };
  approvalRounds?: number;
  /** They said they run several shows (S1), so offer "add another show" when this one goes live. */
  moreShows?: boolean;
}
