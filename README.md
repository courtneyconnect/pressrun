# PressRun

Press-tour booking marketplace for talent and press stops.

## Tech Stack

- **Mobile**: Expo SDK 53, React Native 0.79, TypeScript, NativeWind, React Query, Zustand
- **Backend**: Hono, Bun, Prisma 6 (SQLite), Better Auth (Email OTP)
- **Auth**: Email OTP via Better Auth + Vibecode SMTP
- **Styling**: NativeWind (TailwindCSS), dark-first theme (black/charcoal/red)

## User Roles

| Role | Description |
|------|-------------|
| **Talent** | Creators, artists, influencers, athletes, speakers going on press runs |
| **PressStop** | Podcasts, brands, media outlets, retail stores, event spaces, livestream studios |
| **Admin** | Platform moderators |

## Database Schema (18 tables)

User, Session, Account, Verification, TalentProfile, PressStopProfile, PortfolioItem, Tour, TourStop, Booking, Offer, Message, Availability, AvailabilityException, Review, Report, Notification, ContentSeries

### ContentSeries fields
- title, description, coverImage, examples (JSON), durationMinutes, price, category, active, order

## API Endpoints

### Auth
- `POST /api/auth/email-otp/send-verification-otp` - Send OTP
- `POST /api/auth/sign-in/email-otp` - Verify OTP and sign in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get session

### Users
- `GET /api/users/me` - Current user profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/role` - Set role
- `GET /api/users/:id` - Public profile
- `POST /api/users/me/portfolio` - Add portfolio item
- `DELETE /api/users/me/portfolio/:id` - Remove portfolio item

### Discovery
- `GET /api/discover` - Search PressStops (city, category, fee range, rating, sort)

### Tours
- `GET /api/tours` - List tours
- `POST /api/tours` - Create tour
- `GET /api/tours/:id` - Tour details
- `PUT /api/tours/:id` - Update tour
- `DELETE /api/tours/:id` - Delete tour
- `POST /api/tours/:id/stops` - Add stop
- `PUT /api/tours/:tourId/stops/:stopId` - Update stop
- `DELETE /api/tours/:tourId/stops/:stopId` - Delete stop

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Booking details
- `PUT /api/bookings/:id/status` - Update status
- `POST /api/bookings/:id/offers` - Submit offer
- `PUT /api/bookings/:id/offers/:offerId` - Accept/reject offer

### Messages
- `GET /api/messages/conversations` - Conversation list
- `GET /api/messages/:userId` - Messages with user
- `POST /api/messages/:userId` - Send message
- `PUT /api/messages/:messageId/read` - Mark read
- `GET /api/messages/unread-count` - Unread count

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/user/:userId` - User reviews

### Availability
- `GET /api/availability` - My availability
- `PUT /api/availability` - Set availability
- `POST /api/availability/exceptions` - Add exception
- `GET /api/availability/user/:userId` - User availability
- `GET /api/availability/check` - Check availability

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id/read` - Mark read
- `PUT /api/notifications/read-all` - Mark all read
- `GET /api/notifications/unread-count` - Unread count

### Admin
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/verify` - Verify user
- `PUT /api/admin/users/:id/ban` - Ban user
- `GET /api/admin/bookings` - All bookings
- `GET /api/admin/reports` - All reports
- `PUT /api/admin/reports/:id` - Resolve report
- `GET /api/admin/stats` - Dashboard stats

## Booking State Machine

```
PENDING -> ACCEPTED / CANCELLED
ACCEPTED -> NEGOTIATING / CONFIRMED / CANCELLED
NEGOTIATING -> CONFIRMED / CANCELLED
CONFIRMED -> IN_PROGRESS / CANCELLED
IN_PROGRESS -> COMPLETED / DISPUTED
COMPLETED (terminal)
CANCELLED (terminal)
DISPUTED -> COMPLETED / CANCELLED (admin)
```

## Ranking Algorithm (Discovery)

When sorted by relevance, PressStops are scored by:
- Distance proximity: 30% weight
- Average rating: 25% weight
- Response rate: 20% weight
- Review count (log-scaled): 15% weight
- Verified badge: 10% weight

## Mobile Screens

- Sign In / Verify OTP (auth flow)
- Onboarding (role + category selection)
- Discover (search PressStops with filters)
- Tours (manage press tours / availability)
- Bookings (booking management with status filters)
- Messages (conversation list + chat)
- Profile (stats, portfolio, settings)
- PressStop Detail (full profile + book CTA)
- Booking Detail (status actions, offers, review)
- Create Tour (multi-stop tour builder)
- Edit Profile (all profile fields)

## Design

- **Colors**: Black (#000000), Charcoal (#1C1C1E), Red (#E53935), White (#FFFFFF)
- **Theme**: Dark-first, premium, creator-economy native
- **Icons**: lucide-react-native
