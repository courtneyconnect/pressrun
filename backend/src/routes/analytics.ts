import { Hono } from "hono";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const analyticsRouter = new Hono<{ Variables: AuthVariables }>();

// GET /me - private creator analytics
analyticsRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user")!;

  // All bookings where this user is the talent (creator being booked)
  const bookings = await prisma.booking.findMany({
    where: { talentId: user.id },
    select: {
      id: true,
      status: true,
      agreedFee: true,
      platformFee: true,
      type: true,
      confirmedDate: true,
      proposedDate: true,
      createdAt: true,
      pressStop: {
        select: { id: true, name: true, image: true, city: true, state: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Revenue = sum of agreedFee for COMPLETED bookings (minus platformFee)
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const totalRevenueCents = completedBookings.reduce(
    (sum, b) => sum + Math.max(0, b.agreedFee - b.platformFee),
    0
  );

  // Total press stops booked = unique pressStopIds across all non-cancelled bookings
  const activeBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "DISPUTED"
  );
  const uniquePressStopIds = new Set(activeBookings.map((b) => b.pressStop?.id).filter(Boolean));

  // Content series durations — sum durationMinutes for all series owned by this user
  // multiplied by completed bookings count (each booking = one shoot)
  const series = await prisma.contentSeries.findMany({
    where: { userId: user.id },
    select: { id: true, durationMinutes: true },
  });
  // Simple approach: sum durationMinutes across all completed bookings
  // We don't track which series was booked, so use avgDuration * completedCount
  const avgDurationMinutes =
    series.length > 0
      ? series.reduce((sum, s) => sum + s.durationMinutes, 0) / series.length
      : 60;
  const totalContentMinutes = Math.round(completedBookings.length * avgDurationMinutes);

  // Pending revenue = agreed fees for ACCEPTED/CONFIRMED/IN_PROGRESS bookings
  const pendingBookings = bookings.filter((b) =>
    ["ACCEPTED", "CONFIRMED", "IN_PROGRESS", "NEGOTIATING"].includes(b.status)
  );
  const pendingRevenueCents = pendingBookings.reduce((sum, b) => sum + b.agreedFee, 0);

  // Status breakdown counts
  const statusCounts: Record<string, number> = {};
  for (const b of bookings) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }

  // Recent bookings (last 5)
  const recentBookings = bookings.slice(0, 5).map((b) => ({
    id: b.id,
    status: b.status,
    agreedFee: b.agreedFee,
    platformFee: b.platformFee,
    type: b.type,
    date: b.confirmedDate ?? b.proposedDate ?? b.createdAt,
    pressStop: b.pressStop,
  }));

  return c.json({
    data: {
      totalRevenueCents,
      pendingRevenueCents,
      totalPressStopsBooked: uniquePressStopIds.size,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      totalContentMinutes,
      statusCounts,
      recentBookings,
    },
  });
});

export { analyticsRouter };
