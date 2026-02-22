import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const reviewsRouter = new Hono<{ Variables: AuthVariables }>();

// POST / - create a review (only after completed booking)
reviewsRouter.post(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      bookingId: z.string().min(1),
      revieweeId: z.string().min(1),
      rating: z.number().min(1).max(5),
      content: z.string().optional(),
      professionalism: z.number().min(1).max(5).optional().default(5),
      communication: z.number().min(1).max(5).optional().default(5),
      punctuality: z.number().min(1).max(5).optional().default(5),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    // Verify booking exists and is completed
    const booking = await prisma.booking.findFirst({
      where: {
        id: body.bookingId,
        status: "COMPLETED",
        OR: [{ talentId: user.id }, { pressStopId: user.id }],
      },
    });

    if (!booking) {
      return c.json(
        {
          error: {
            message:
              "Booking not found or not completed",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    // Verify reviewee is the other party in the booking
    if (
      body.revieweeId !== booking.talentId &&
      body.revieweeId !== booking.pressStopId
    ) {
      return c.json(
        {
          error: {
            message: "Invalid reviewee",
            code: "VALIDATION_ERROR",
          },
        },
        400
      );
    }

    // Cannot review yourself
    if (body.revieweeId === user.id) {
      return c.json(
        {
          error: {
            message: "Cannot review yourself",
            code: "VALIDATION_ERROR",
          },
        },
        400
      );
    }

    // Check if already reviewed
    const existing = await prisma.review.findFirst({
      where: {
        bookingId: body.bookingId,
        reviewerId: user.id,
      },
    });

    if (existing) {
      return c.json(
        {
          error: {
            message: "Already reviewed this booking",
            code: "DUPLICATE",
          },
        },
        409
      );
    }

    const review = await prisma.review.create({
      data: {
        bookingId: body.bookingId,
        reviewerId: user.id,
        revieweeId: body.revieweeId,
        rating: body.rating,
        content: body.content ?? null,
        professionalism: body.professionalism,
        communication: body.communication,
        punctuality: body.punctuality,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Update reviewee's average rating
    const allReviews = await prisma.review.findMany({
      where: { revieweeId: body.revieweeId },
      select: { rating: true },
    });

    const totalReviews = allReviews.length;
    const avgRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    await prisma.user.update({
      where: { id: body.revieweeId },
      data: {
        avgRating: Math.round(avgRating * 100) / 100,
        totalReviews,
      },
    });

    // Notify reviewee
    await prisma.notification.create({
      data: {
        userId: body.revieweeId,
        type: "NEW_REVIEW",
        title: "New Review",
        body: `${user.name} left you a ${body.rating}-star review`,
        data: JSON.stringify({ reviewId: review.id, bookingId: body.bookingId }),
      },
    });

    return c.json({ data: review }, 201);
  }
);

// GET /user/:userId - get reviews for a user
reviewsRouter.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { revieweeId: userId } }),
  ]);

  return c.json({
    data: {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export { reviewsRouter };
