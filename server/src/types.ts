// Shared shapes for messages, accounts, profiles and Press Stops.

/** One bubble Press Run sends. */
export type Out =
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt: string; ref?: string }
  | { type: "video"; url: string; alt: string; ref?: string }
  | { type: "contact" }
  | { type: "link"; url: string };

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

export type Flow = "booker" | "stop";

export interface FlowState {
  retries: Record<string, number>;
  history: string[];
  /** After the booker flow ends, continue into the Press Stop flow. */
  then?: Flow | null;
  stopId?: string;
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
  samples: { url?: string; mediaUrl?: string }[];
  rightsConfirmed: boolean;
  cover?: "frame" | string;
  /** The two files Press Run makes, and how the clip was cut. */
  media?: { cardUrl?: string; clipUrl?: string; coverKey?: string; clipStart?: number; episode?: number; version: number };
  approvalRounds?: number;
  /** They said they run several shows (S1), so offer "add another show" when this one goes live. */
  moreShows?: boolean;
}
