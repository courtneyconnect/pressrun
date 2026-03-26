import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";
import { sendPushNotification } from "../pushNotifications";

const bookingsRouter = new Hono<{ Variables: AuthVariables }>();

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["NEGOTIATING", "CONFIRMED", "CANCELLED"],
  NEGOTIATING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

function canTransition(current: string, next: string): boolean {
  return STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

// GET / - list user's bookings (both as talent and pressstop)
bookingsRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const status = c.req.query("status");
  const role = c.req.query("role"); // "talent" or "pressstop"

  const where: Record<string, unknown> = {};

  if (role === "talent") {
    where.talentId = user.id;
  } else if (role === "pressstop") {
    where.pressStopId = user.id;
  } else {
    where.OR = [{ talentId: user.id }, { pressStopId: user.id }];
  }

  if (status) {
    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where: where as any,
    include: {
      talent: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          avgRating: true,
        },
      },
      pressStop: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          avgRating: true,
        },
      },
      tourStop: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: bookings });
});

// POST / - create a booking request
bookingsRouter.post(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      pressStopId: z.string().min(1),
      tourStopId: z.string().optional(),
      type: z.string().optional().default("INTERVIEW"),
      title: z.string().min(1),
      description: z.string().optional(),
      proposedDate: z.string().optional(),
      preferredPostingDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      agreedFee: z.number().optional().default(0),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    // Verify press stop (creator) exists
    const pressStop = await prisma.user.findUnique({
      where: { id: body.pressStopId },
      include: { pressStopProfile: true },
    });

    if (!pressStop) {
      return c.json(
        {
          error: {
            message: "Creator not found",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    const booking = await prisma.booking.create({
      data: {
        talentId: user.id,
        pressStopId: body.pressStopId,
        tourStopId: body.tourStopId ?? null,
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        proposedDate: body.proposedDate
          ? new Date(body.proposedDate)
          : null,
        preferredPostingDate: body.preferredPostingDate ? new Date(body.preferredPostingDate) : null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        location: body.location ?? null,
        agreedFee: body.agreedFee,
        platformFee: Math.round(body.agreedFee * 0.08), // 8% platform fee
      },
      include: {
        talent: {
          select: { id: true, name: true, image: true },
        },
        pressStop: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Create notification for press stop owner
    await prisma.notification.create({
      data: {
        userId: body.pressStopId,
        type: "BOOKING_REQUEST",
        title: "New Booking Request",
        body: `${user.name} has requested a booking: ${body.title}`,
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    return c.json({ data: booking }, 201);
  }
);

// GET /:id - get booking details
bookingsRouter.get("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      OR: [{ talentId: user.id }, { pressStopId: user.id }],
    },
    include: {
      talent: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          avgRating: true,
          headline: true,
        },
      },
      pressStop: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          avgRating: true,
          headline: true,
        },
      },
      tourStop: true,
      offers: {
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!booking) {
    return c.json(
      { error: { message: "Booking not found", code: "NOT_FOUND" } },
      404
    );
  }

  return c.json({ data: booking });
});

// PUT /:id/status - update booking status
bookingsRouter.put(
  "/:id/status",
  requireAuth,
  zValidator(
    "json",
    z.object({
      status: z.string().min(1),
      cancellationReason: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        OR: [{ talentId: user.id }, { pressStopId: user.id }],
      },
    });

    if (!booking) {
      return c.json(
        { error: { message: "Booking not found", code: "NOT_FOUND" } },
        404
      );
    }

    if (!canTransition(booking.status, body.status)) {
      return c.json(
        {
          error: {
            message: `Cannot transition from ${booking.status} to ${body.status}`,
            code: "INVALID_TRANSITION",
          },
        },
        400
      );
    }

    // Only ADMIN can resolve disputed bookings
    if (booking.status === "DISPUTED") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!dbUser || dbUser.role !== "ADMIN") {
        return c.json(
          {
            error: {
              message: "Only admins can resolve disputes",
              code: "FORBIDDEN",
            },
          },
          403
        );
      }
    }

    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    if (body.status === "CANCELLED") {
      updateData.cancelledBy = user.id;
      updateData.cancellationReason = body.cancellationReason ?? null;
    }

    if (body.status === "CONFIRMED" && booking.proposedDate) {
      updateData.confirmedDate = booking.proposedDate;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        talent: {
          select: { id: true, name: true },
        },
        pressStop: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-create payment record when confirmed with a fee
    if (body.status === "CONFIRMED" && updated.agreedFee > 0) {
      const alreadyExists = await prisma.payment.findUnique({ where: { bookingId: id } });
      if (!alreadyExists) {
        const platformFee = Math.round(updated.agreedFee * 0.08);
        await prisma.payment.create({
          data: {
            bookingId: id,
            agreedFee: updated.agreedFee,
            platformFee,
            talentPayout: updated.agreedFee - platformFee,
            status: "HELD",
            payerId: booking.pressStopId,
            payeeId: booking.talentId,
          },
        });
        await prisma.booking.update({
          where: { id },
          data: { escrowStatus: "HELD", platformFee },
        });
      }
    }

    // Notify the other party
    const notifyUserId =
      user.id === booking.talentId
        ? booking.pressStopId
        : booking.talentId;

    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: "BOOKING_STATUS_UPDATE",
        title: "Booking Status Updated",
        body: `Booking "${booking.title}" has been updated to ${body.status}`,
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    // Send push notification
    const notifyUser = await prisma.user.findUnique({
      where: { id: notifyUserId },
      select: { pushToken: true },
    });
    if (notifyUser?.pushToken) {
      await sendPushNotification(
        notifyUser.pushToken,
        "Booking Status Updated",
        `Booking "${booking.title}" is now ${body.status}`,
        { bookingId: booking.id, screen: "booking" }
      );
    }

    return c.json({ data: updated });
  }
);

// POST /:id/offers - submit an offer/counteroffer
bookingsRouter.post(
  "/:id/offers",
  requireAuth,
  zValidator(
    "json",
    z.object({
      amount: z.number().min(0),
      message: z.string().optional(),
      expiresAt: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const bookingId = c.req.param("id");
    const body = c.req.valid("json");

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ talentId: user.id }, { pressStopId: user.id }],
      },
    });

    if (!booking) {
      return c.json(
        { error: { message: "Booking not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Auto-transition to NEGOTIATING if currently ACCEPTED
    if (booking.status === "ACCEPTED") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "NEGOTIATING" },
      });
    }

    const offer = await prisma.offer.create({
      data: {
        bookingId,
        senderId: user.id,
        amount: body.amount,
        message: body.message ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Notify the other party
    const notifyUserId =
      user.id === booking.talentId
        ? booking.pressStopId
        : booking.talentId;

    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: "NEW_OFFER",
        title: "New Offer",
        body: `New offer of $${(body.amount / 100).toFixed(2)} for "${booking.title}"`,
        data: JSON.stringify({ bookingId, offerId: offer.id }),
      },
    });

    // Send push notification for the new offer
    const offerNotifyUser = await prisma.user.findUnique({
      where: { id: notifyUserId },
      select: { pushToken: true },
    });
    if (offerNotifyUser?.pushToken) {
      await sendPushNotification(
        offerNotifyUser.pushToken,
        "New Offer",
        `New offer of $${(body.amount / 100).toFixed(2)} for "${booking.title}"`,
        { bookingId, screen: "booking" }
      );
    }

    return c.json({ data: offer }, 201);
  }
);

// PUT /:id/offers/:offerId - accept/reject an offer
bookingsRouter.put(
  "/:id/offers/:offerId",
  requireAuth,
  zValidator(
    "json",
    z.object({
      status: z.enum(["ACCEPTED", "REJECTED"]),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const bookingId = c.req.param("id");
    const offerId = c.req.param("offerId");
    const body = c.req.valid("json");

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ talentId: user.id }, { pressStopId: user.id }],
      },
    });

    if (!booking) {
      return c.json(
        { error: { message: "Booking not found", code: "NOT_FOUND" } },
        404
      );
    }

    const offer = await prisma.offer.findFirst({
      where: { id: offerId, bookingId },
    });

    if (!offer) {
      return c.json(
        { error: { message: "Offer not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Cannot accept/reject your own offer
    if (offer.senderId === user.id) {
      return c.json(
        {
          error: {
            message: "Cannot accept/reject your own offer",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: body.status },
    });

    // If accepted, update booking fee and set to CONFIRMED
    if (body.status === "ACCEPTED") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          agreedFee: offer.amount,
          platformFee: Math.round(offer.amount * 0.08),
          status: "CONFIRMED",
        },
      });

      // Auto-create payment record when offer accepted
      const alreadyExists = await prisma.payment.findUnique({ where: { bookingId } });
      if (!alreadyExists && offer.amount > 0) {
        const platformFee = Math.round(offer.amount * 0.08);
        await prisma.payment.create({
          data: {
            bookingId,
            agreedFee: offer.amount,
            platformFee,
            talentPayout: offer.amount - platformFee,
            status: "HELD",
            payerId: booking.pressStopId,
            payeeId: booking.talentId,
          },
        });
        await prisma.booking.update({
          where: { id: bookingId },
          data: { escrowStatus: "HELD" },
        });
      }
    }

    return c.json({ data: updatedOffer });
  }
);

// GET /:id/offers - list offers for a booking
bookingsRouter.get("/:id/offers", requireAuth, async (c) => {
  const user = c.get("user")!;
  const bookingId = c.req.param("id");

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ talentId: user.id }, { pressStopId: user.id }],
    },
  });

  if (!booking) {
    return c.json(
      { error: { message: "Booking not found", code: "NOT_FOUND" } },
      404
    );
  }

  const offers = await prisma.offer.findMany({
    where: { bookingId },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: offers });
});

export { bookingsRouter };
