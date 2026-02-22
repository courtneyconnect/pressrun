import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const toursRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - list current user's tours
toursRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  const tours = await prisma.tour.findMany({
    where: { talentId: user.id },
    include: {
      stops: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ data: tours });
});

// POST / - create a tour with stops
toursRouter.post(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      status: z.string().optional().default("DRAFT"),
      pressStopTypes: z.array(z.string()).optional().default([]),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      stops: z
        .array(
          z.object({
            city: z.string().min(1),
            state: z.string().optional(),
            country: z.string().optional().default("US"),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            arrivalDate: z.string(),
            departureDate: z.string(),
            order: z.number().optional().default(0),
          })
        )
        .optional()
        .default([]),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const tour = await prisma.tour.create({
      data: {
        talentId: user.id,
        name: body.name,
        status: body.status,
        pressStopTypes: JSON.stringify(body.pressStopTypes),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        stops: {
          create: body.stops.map((stop, index) => ({
            city: stop.city,
            state: stop.state ?? null,
            country: stop.country,
            latitude: stop.latitude ?? null,
            longitude: stop.longitude ?? null,
            arrivalDate: new Date(stop.arrivalDate),
            departureDate: new Date(stop.departureDate),
            order: stop.order ?? index,
          })),
        },
      },
      include: {
        stops: { orderBy: { order: "asc" } },
      },
    });

    return c.json({ data: tour }, 201);
  }
);

// GET /:id - get tour details with stops
toursRouter.get("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const tour = await prisma.tour.findFirst({
    where: { id, talentId: user.id },
    include: {
      stops: {
        orderBy: { order: "asc" },
        include: {
          bookings: {
            include: {
              pressStop: {
                select: { id: true, name: true, image: true, city: true },
              },
            },
          },
        },
      },
    },
  });

  if (!tour) {
    return c.json(
      { error: { message: "Tour not found", code: "NOT_FOUND" } },
      404
    );
  }

  return c.json({ data: tour });
});

// PUT /:id - update tour
toursRouter.put(
  "/:id",
  requireAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      status: z.string().optional(),
      pressStopTypes: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const existing = await prisma.tour.findFirst({
      where: { id, talentId: user.id },
    });

    if (!existing) {
      return c.json(
        { error: { message: "Tour not found", code: "NOT_FOUND" } },
        404
      );
    }

    const updated = await prisma.tour.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        status: body.status ?? undefined,
        pressStopTypes: body.pressStopTypes !== undefined ? JSON.stringify(body.pressStopTypes) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
      include: {
        stops: { orderBy: { order: "asc" } },
      },
    });

    return c.json({ data: updated });
  }
);

// DELETE /:id - delete tour
toursRouter.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const existing = await prisma.tour.findFirst({
    where: { id, talentId: user.id },
  });

  if (!existing) {
    return c.json(
      { error: { message: "Tour not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.tour.delete({ where: { id } });

  return c.json({ data: { success: true } });
});

// POST /:id/stops - add a tour stop
toursRouter.post(
  "/:id/stops",
  requireAuth,
  zValidator(
    "json",
    z.object({
      city: z.string().min(1),
      state: z.string().optional(),
      country: z.string().optional().default("US"),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      arrivalDate: z.string(),
      departureDate: z.string(),
      order: z.number().optional().default(0),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const tourId = c.req.param("id");
    const body = c.req.valid("json");

    const tour = await prisma.tour.findFirst({
      where: { id: tourId, talentId: user.id },
    });

    if (!tour) {
      return c.json(
        { error: { message: "Tour not found", code: "NOT_FOUND" } },
        404
      );
    }

    const stop = await prisma.tourStop.create({
      data: {
        tourId,
        city: body.city,
        state: body.state ?? null,
        country: body.country,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        arrivalDate: new Date(body.arrivalDate),
        departureDate: new Date(body.departureDate),
        order: body.order,
      },
    });

    return c.json({ data: stop }, 201);
  }
);

// PUT /:tourId/stops/:stopId - update a stop
toursRouter.put(
  "/:tourId/stops/:stopId",
  requireAuth,
  zValidator(
    "json",
    z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      arrivalDate: z.string().optional(),
      departureDate: z.string().optional(),
      order: z.number().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const tourId = c.req.param("tourId");
    const stopId = c.req.param("stopId");
    const body = c.req.valid("json");

    const tour = await prisma.tour.findFirst({
      where: { id: tourId, talentId: user.id },
    });

    if (!tour) {
      return c.json(
        { error: { message: "Tour not found", code: "NOT_FOUND" } },
        404
      );
    }

    const stop = await prisma.tourStop.findFirst({
      where: { id: stopId, tourId },
    });

    if (!stop) {
      return c.json(
        { error: { message: "Tour stop not found", code: "NOT_FOUND" } },
        404
      );
    }

    const updated = await prisma.tourStop.update({
      where: { id: stopId },
      data: {
        city: body.city ?? undefined,
        state: body.state ?? undefined,
        country: body.country ?? undefined,
        latitude: body.latitude ?? undefined,
        longitude: body.longitude ?? undefined,
        arrivalDate: body.arrivalDate
          ? new Date(body.arrivalDate)
          : undefined,
        departureDate: body.departureDate
          ? new Date(body.departureDate)
          : undefined,
        order: body.order ?? undefined,
      },
    });

    return c.json({ data: updated });
  }
);

// DELETE /:tourId/stops/:stopId - delete a stop
toursRouter.delete(
  "/:tourId/stops/:stopId",
  requireAuth,
  async (c) => {
    const user = c.get("user")!;
    const tourId = c.req.param("tourId");
    const stopId = c.req.param("stopId");

    const tour = await prisma.tour.findFirst({
      where: { id: tourId, talentId: user.id },
    });

    if (!tour) {
      return c.json(
        { error: { message: "Tour not found", code: "NOT_FOUND" } },
        404
      );
    }

    const stop = await prisma.tourStop.findFirst({
      where: { id: stopId, tourId },
    });

    if (!stop) {
      return c.json(
        { error: { message: "Tour stop not found", code: "NOT_FOUND" } },
        404
      );
    }

    await prisma.tourStop.delete({ where: { id: stopId } });

    return c.json({ data: { success: true } });
  }
);

// POST /:id/save - save a press stop to a tour
toursRouter.post("/:id/save", requireAuth, zValidator("json", z.object({
  pressStopUserId: z.string(),
  seriesId: z.string().optional(),
})), async (c) => {
  const user = c.get("user")!;
  const tourId = c.req.param("id");
  const body = c.req.valid("json");

  const tour = await prisma.tour.findFirst({ where: { id: tourId, talentId: user.id } });
  if (!tour) return c.json({ error: { message: "Tour not found", code: "NOT_FOUND" } }, 404);

  const saved = await prisma.savedTourStop.upsert({
    where: { tourId_userId: { tourId, userId: body.pressStopUserId } },
    create: { tourId, userId: body.pressStopUserId, savedById: user.id, seriesId: body.seriesId ?? null },
    update: { seriesId: body.seriesId ?? null },
    include: { pressStop: { select: { id: true, name: true, image: true, headline: true, city: true } } },
  });
  return c.json({ data: saved }, 201);
});

// DELETE /:id/save/:userId - remove a saved press stop
toursRouter.delete("/:id/save/:userId", requireAuth, async (c) => {
  const user = c.get("user")!;
  const tourId = c.req.param("id");
  const pressStopUserId = c.req.param("userId");

  const tour = await prisma.tour.findFirst({ where: { id: tourId, talentId: user.id } });
  if (!tour) return c.json({ error: { message: "Tour not found", code: "NOT_FOUND" } }, 404);

  await prisma.savedTourStop.deleteMany({ where: { tourId, userId: pressStopUserId } });
  return c.json({ data: { success: true } });
});

// GET /:id/saved - get all saved press stops for a tour
toursRouter.get("/:id/saved", requireAuth, async (c) => {
  const user = c.get("user")!;
  const tourId = c.req.param("id");

  const tour = await prisma.tour.findFirst({ where: { id: tourId, talentId: user.id } });
  if (!tour) return c.json({ error: { message: "Tour not found", code: "NOT_FOUND" } }, 404);

  const saved = await prisma.savedTourStop.findMany({
    where: { tourId },
    include: {
      pressStop: { select: { id: true, name: true, image: true, headline: true, city: true, avgRating: true, totalReviews: true, verified: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: saved });
});

export { toursRouter };
