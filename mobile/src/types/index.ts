export type UserRole = "TALENT" | "PRESS_STOP" | "ADMIN";

export type TalentCategory =
  | "CREATOR"
  | "ARTIST"
  | "INFLUENCER"
  | "ATHLETE"
  | "SPEAKER"
  | "MUSICIAN"
  | "AUTHOR"
  | "OTHER";

export type PressStopCategory =
  | "PODCAST"
  | "BRAND"
  | "MEDIA_OUTLET"
  | "RETAIL_STORE"
  | "EVENT_SPACE"
  | "LIVESTREAM_STUDIO"
  | "CREATOR"
  | "OTHER";

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "NEGOTIATING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type BookingType =
  | "INTERVIEW"
  | "APPEARANCE"
  | "CONTENT_CREATION"
  | "PROMOTIONAL"
  | "COLLAB"
  | "EVENT"
  | "OTHER";

export type EscrowStatus = "NONE" | "HELD" | "RELEASED" | "REFUNDED";

export type OfferStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "COUNTERED";

export type MessageType =
  | "TEXT"
  | "OFFER"
  | "SYSTEM"
  | "FILE"
  | "CALENDAR_INVITE";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  bio: string | null;
  headline: string | null;
  verified: boolean;
  profileComplete: boolean;
  responseRate: number;
  avgRating: number;
  totalReviews: number;
  socialFollowers: number;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  twitterHandle: string | null;
  twitchUrl: string | null;
  kickUrl: string | null;
  whatnotUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  talentProfile?: TalentProfile | null;
  pressStopProfile?: PressStopProfile | null;
  contentSeries?: ContentSeries[];
}

export interface SeriesExample {
  type: "video" | "link";
  url: string;
  label?: string;
}

export interface ContentSeries {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  examples: string | null; // JSON string of SeriesExample[]
  durationMinutes: number;
  price: number;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TalentProfile {
  id: string;
  userId: string;
  category: TalentCategory;
  audienceSize: number;
  tourActive: boolean;
}

export interface PressStopProfile {
  id: string;
  userId: string;
  category: PressStopCategory;
  capacity: number;
  baseFee: number;
  acceptingBookings: boolean;
  physicalAddress: string | null;
  operatingHours: string | null;
}

export interface Tour {
  id: string;
  talentId: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  stops?: TourStop[];
}

export interface TourStop {
  id: string;
  tourId: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  arrivalDate: string;
  departureDate: string;
  order: number;
}

export interface Booking {
  id: string;
  talentId: string;
  pressStopId: string;
  tourStopId: string | null;
  status: BookingStatus;
  type: BookingType;
  title: string;
  description: string | null;
  proposedDate: string | null;
  confirmedDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  agreedFee: number;
  platformFee: number;
  escrowStatus: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  talent?: User;
  pressStop?: User;
  offers?: Offer[];
}

export interface Offer {
  id: string;
  bookingId: string;
  senderId: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  expiresAt: string | null;
  createdAt: string;
  sender?: User;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId: string | null;
  content: string;
  type: MessageType;
  read: boolean;
  fileUrl: string | null;
  createdAt: string;
}

export interface Conversation {
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  content: string | null;
  professionalism: number;
  communication: number;
  punctuality: number;
  createdAt: string;
  reviewer?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: string | null;
  read: boolean;
  createdAt: string;
}

export interface DiscoverResult {
  user: User;
  pressStopProfile: PressStopProfile;
  distance?: number;
  relevanceScore?: number;
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
