import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const usersRouter = new Hono<{ Variables: AuthVariables }>();

// GET /me - get current user's full profile
usersRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user")!;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      talentProfile: true,
      pressStopProfile: true,
      portfolioItems: { orderBy: { order: "asc" } },
      contentSeries: { orderBy: { order: "asc" }, where: { active: true } },
    },
  });

  if (!dbUser) {
    return c.json(
      { error: { message: "User not found", code: "NOT_FOUND" } },
      404
    );
  }

  return c.json({ data: dbUser });
});

// PUT /me - update profile
usersRouter.put(
  "/me",
  requireAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      bio: z.string().nullable().optional(),
      headline: z.string().nullable().optional(),
      instagramHandle: z.string().nullable().optional(),
      tiktokHandle: z.string().nullable().optional(),
      youtubeHandle: z.string().nullable().optional(),
      twitterHandle: z.string().nullable().optional(),
      twitchUrl: z.string().nullable().optional(),
      kickUrl: z.string().nullable().optional(),
      whatnotUrl: z.string().nullable().optional(),
      linkedinUrl: z.string().nullable().optional(),
      websiteUrl: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      image: z.string().nullable().optional(),
      socialFollowers: z.number().optional(),
      showCue: z.boolean().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body,
    });

    return c.json({ data: updated });
  }
);

// PUT /me/role - set role and create associated profile
usersRouter.put(
  "/me/role",
  requireAuth,
  zValidator(
    "json",
    z.object({
      role: z.enum(["TALENT", "PRESS_STOP"]),
      // Talent-specific
      category: z.string().optional(),
      audienceSize: z.number().optional(),
      // PressStop-specific
      capacity: z.number().optional(),
      baseFee: z.number().optional(),
      physicalAddress: z.string().optional(),
      operatingHours: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const updated = await prisma.$transaction(async (tx) => {
      // Update user role
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { role: body.role, profileComplete: true },
      });

      if (body.role === "TALENT") {
        // Upsert talent profile
        await tx.talentProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            category: body.category ?? "CREATOR",
            audienceSize: body.audienceSize ?? 0,
          },
          update: {
            category: body.category ?? undefined,
            audienceSize: body.audienceSize ?? undefined,
          },
        });
        // Delete press stop profile if exists
        await tx.pressStopProfile
          .delete({ where: { userId: user.id } })
          .catch(() => {});
      } else {
        // Upsert press stop profile
        await tx.pressStopProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            category: body.category ?? "PODCAST",
            capacity: body.capacity ?? 1,
            baseFee: body.baseFee ?? 0,
            physicalAddress: body.physicalAddress ?? null,
            operatingHours: body.operatingHours ?? null,
          },
          update: {
            category: body.category ?? undefined,
            capacity: body.capacity ?? undefined,
            baseFee: body.baseFee ?? undefined,
            physicalAddress: body.physicalAddress ?? undefined,
            operatingHours: body.operatingHours ?? undefined,
          },
        });
        // Delete talent profile if exists
        await tx.talentProfile
          .delete({ where: { userId: user.id } })
          .catch(() => {});
      }

      return updatedUser;
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        talentProfile: true,
        pressStopProfile: true,
      },
    });

    return c.json({ data: fullUser });
  }
);

// GET /:id/cue - get upcoming booking cue for a press stop
usersRouter.get("/:id/cue", async (c) => {
  const id = c.req.param("id");
  const user = await prisma.user.findUnique({
    where: { id },
    select: { showCue: true },
  });
  if (!user) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  if (!user.showCue) return c.json({ data: [] });

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      pressStopId: id,
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      OR: [
        { confirmedDate: { gte: now } },
        { proposedDate: { gte: now } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: {
      id: true,
      type: true,
      title: true,
      confirmedDate: true,
      proposedDate: true,
      status: true,
    },
  });

  const cue = bookings.map((b) => ({
    id: b.id,
    type: b.type,
    date: b.confirmedDate ?? b.proposedDate,
    status: b.status,
  }));
  return c.json({ data: cue });
});

// GET /search?q= - search users by name
usersRouter.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ data: [] });

  const users = await prisma.user.findMany({
    where: {
      name: { contains: q },
    },
    select: {
      id: true,
      name: true,
      image: true,
      headline: true,
      city: true,
      state: true,
      verified: true,
      avgRating: true,
      totalReviews: true,
      role: true,
    },
    take: 20,
  });

  return c.json({ data: users });
});

// GET /:id - get public profile of any user
usersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const dbUser = await prisma.user.findUnique({
    where: { id },
    include: {
      talentProfile: true,
      pressStopProfile: true,
      portfolioItems: { orderBy: { order: "asc" } },
      contentSeries: { orderBy: { order: "asc" }, where: { active: true } },
    },
  });

  if (!dbUser) {
    return c.json(
      { error: { message: "User not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Return public-safe fields
  const {
    ...publicUser
  } = dbUser;

  return c.json({ data: publicUser });
});

// GET /:id/portfolio - get user's portfolio items
usersRouter.get("/:id/portfolio", async (c) => {
  const id = c.req.param("id");

  const items = await prisma.portfolioItem.findMany({
    where: { userId: id },
    orderBy: { order: "asc" },
  });

  return c.json({ data: items });
});

// POST /me/portfolio - add portfolio item
usersRouter.post(
  "/me/portfolio",
  requireAuth,
  zValidator(
    "json",
    z.object({
      type: z.enum(["IMAGE", "VIDEO", "AUDIO", "LINK"]).optional().default("IMAGE"),
      url: z.string().min(1),
      title: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional().default(0),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const item = await prisma.portfolioItem.create({
      data: {
        userId: user.id,
        type: body.type,
        url: body.url,
        title: body.title ?? null,
        description: body.description ?? null,
        order: body.order,
      },
    });

    return c.json({ data: item }, 201);
  }
);

// DELETE /me/portfolio/:id - delete portfolio item
usersRouter.delete("/me/portfolio/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const item = await prisma.portfolioItem.findFirst({
    where: { id, userId: user.id },
  });

  if (!item) {
    return c.json(
      { error: { message: "Portfolio item not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.portfolioItem.delete({ where: { id } });

  return c.json({ data: { success: true } });
});

// GET /me/series - list current user's content series
usersRouter.get("/me/series", requireAuth, async (c) => {
  const user = c.get("user")!;
  const series = await prisma.contentSeries.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });
  return c.json({ data: series });
});

// POST /me/series - create a content series
usersRouter.post(
  "/me/series",
  requireAuth,
  zValidator(
    "json",
    z.object({
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      coverImage: z.string().nullable().optional(),
      examples: z.string().nullable().optional(),
      durationMinutes: z.number().min(5).max(480).default(60),
      price: z.number().min(0).default(0),
      category: z.string().optional().default("OTHER"),
      order: z.number().optional().default(0),
      postingTimeline: z.string().nullable().optional(),
      cities: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");
    const item = await prisma.contentSeries.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        coverImage: body.coverImage ?? null,
        examples: body.examples ?? null,
        durationMinutes: body.durationMinutes,
        price: body.price,
        category: body.category,
        order: body.order,
        postingTimeline: body.postingTimeline ?? null,
        cities: body.cities ?? null,
      },
    });
    return c.json({ data: item }, 201);
  }
);

// PUT /me/series/:id - update a content series
usersRouter.put(
  "/me/series/:id",
  requireAuth,
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      coverImage: z.string().nullable().optional(),
      examples: z.string().nullable().optional(),
      durationMinutes: z.number().min(5).max(480).optional(),
      price: z.number().min(0).optional(),
      active: z.boolean().optional(),
      category: z.string().optional(),
      order: z.number().optional(),
      postingTimeline: z.string().nullable().optional(),
      cities: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.contentSeries.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
    }

    const updated = await prisma.contentSeries.update({
      where: { id },
      data: body,
    });
    return c.json({ data: updated });
  }
);

// DELETE /me/series/:id - delete a content series
usersRouter.delete("/me/series/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const existing = await prisma.contentSeries.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  await prisma.contentSeries.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

export { usersRouter };
