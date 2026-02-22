import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const paymentsRouter = new Hono<{ Variables: AuthVariables }>();

// GET /summary - get platform fee stats for admin
paymentsRouter.get("/summary", requireAuth, async (c) => {
  const user = c.get("user")!;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const payments = await prisma.payment.aggregate({
    _sum: { agreedFee: true, platformFee: true, talentPayout: true },
    _count: { id: true },
  });

  return c.json({ data: payments });
});

// GET /my - get payment history for current user
paymentsRouter.get("/my", requireAuth, async (c) => {
  const user = c.get("user")!;

  const payments = await prisma.payment.findMany({
    where: {
      OR: [{ payerId: user.id }, { payeeId: user.id }],
    },
    include: {
      booking: {
        select: {
          id: true,
          title: true,
          status: true,
          talent: { select: { id: true, name: true, image: true } },
          pressStop: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: payments });
});

// POST /create - create a payment record when booking is confirmed
// Called internally when a booking is confirmed with an agreed fee
paymentsRouter.post(
  "/create",
  requireAuth,
  zValidator("json", z.object({ bookingId: z.string() })),
  async (c) => {
    const user = c.get("user")!;
    const { bookingId } = c.req.valid("json");

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ talentId: user.id }, { pressStopId: user.id }],
        status: "CONFIRMED",
      },
    });

    if (!booking) {
      return c.json({ error: { message: "Booking not found or not confirmed", code: "NOT_FOUND" } }, 404);
    }

    // Don't create duplicate payment
    const existing = await prisma.payment.findUnique({ where: { bookingId } });
    if (existing) {
      return c.json({ data: existing });
    }

    const platformFee = Math.round(booking.agreedFee * 0.08);
    const talentPayout = booking.agreedFee - platformFee;

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        agreedFee: booking.agreedFee,
        platformFee,
        talentPayout,
        status: "HELD",
        payerId: booking.pressStopId,
        payeeId: booking.talentId,
      },
    });

    // Update booking escrow status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { escrowStatus: "HELD", platformFee },
    });

    return c.json({ data: payment }, 201);
  }
);

export { paymentsRouter };
