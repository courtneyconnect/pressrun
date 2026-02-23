import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const reviewsRouter = new Hono<{ Variables: AuthVariables }>();

// POST / - create a review
reviewsRouter.post(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      revieweeId: z.string().min(1),
      rating: z.number().min(1).max(5),
      content: z.string().max(180).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    // Cannot review yourself
    if (body.revieweeId === user.id) {
      return c.json(
        { error: { message: "Cannot review yourself", code: "VALIDATION_ERROR" } },
        400
      );
    }

    // Verify reviewee exists
    const reviewee = await prisma.user.findUnique({ where: { id: body.revieweeId } });
    if (!reviewee) {
      return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);
    }

    // Check if already reviewed this user
    const existing = await prisma.review.findFirst({
      where: { reviewerId: user.id, revieweeId: body.revieweeId },
    });

    if (existing) {
      return c.json(
        { error: { message: "You have already reviewed this creator", code: "DUPLICATE" } },
        409
      );
    }

    const review = await prisma.review.create({
      data: {
        bookingId: "direct",
        reviewerId: user.id,
        revieweeId: body.revieweeId,
        rating: body.rating,
        content: body.content ?? null,
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
        data: JSON.stringify({ reviewId: review.id }),
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
