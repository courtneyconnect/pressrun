import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../prisma";
import type { AuthVariables } from "../middleware";

const discoverRouter = new Hono<{ Variables: AuthVariables }>();

// Haversine distance in miles
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const querySchema = z.object({
  city: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional().default(50),
  category: z.string().optional(),
  minFee: z.coerce.number().optional(),
  maxFee: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  available: z.string().optional(),
  sort: z
    .enum(["relevance", "rating", "fee_low", "fee_high", "distance"])
    .optional()
    .default("relevance"),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

// GET / - search PressStops
discoverRouter.get("/", async (c) => {
  const parsed = querySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: "Invalid query parameters",
          code: "VALIDATION_ERROR",
        },
      },
      400
    );
  }

  const query = parsed.data;
  const skip = (query.page - 1) * query.limit;

  // Build where clause for press stop users
  const where: Record<string, unknown> = {
    role: "PRESS_STOP",
    pressStopProfile: {
      isNot: null,
    },
  };

  if (query.city) {
    where.city = { contains: query.city };
  }

  if (query.minRating) {
    where.avgRating = { gte: query.minRating };
  }

  // Fetch press stops from database
  const pressStops = await prisma.user.findMany({
    where: where as any,
    include: {
      pressStopProfile: true,
    },
  });

  // Apply additional filters in memory
  let filtered = pressStops;

  // Category filter
  if (query.category) {
    filtered = filtered.filter(
      (ps) => ps.pressStopProfile?.category === query.category
    );
  }

  // Fee range filter
  if (query.minFee !== undefined) {
    filtered = filtered.filter(
      (ps) => (ps.pressStopProfile?.baseFee ?? 0) >= query.minFee!
    );
  }
  if (query.maxFee !== undefined) {
    filtered = filtered.filter(
      (ps) => (ps.pressStopProfile?.baseFee ?? 0) <= query.maxFee!
    );
  }

  // Distance filter
  const hasCoords =
    query.lat !== undefined && query.lng !== undefined;

  if (hasCoords) {
    filtered = filtered.filter((ps) => {
      if (!ps.latitude || !ps.longitude) return false;
      const dist = haversineDistance(
        query.lat!,
        query.lng!,
        ps.latitude,
        ps.longitude
      );
      return dist <= query.radius;
    });
  }

  // Compute scores and sort
  const maxDistance = query.radius;
  const scored = filtered.map((ps) => {
    let distance: number | null = null;
    if (hasCoords && ps.latitude && ps.longitude) {
      distance = haversineDistance(
        query.lat!,
        query.lng!,
        ps.latitude,
        ps.longitude
      );
    }

    // Relevance scoring
    const distanceScore = distance !== null ? 1 - distance / maxDistance : 0.5;
    const ratingScore = ps.avgRating / 5;
    const responseRateScore = ps.responseRate;
    const reviewCountScore =
      ps.totalReviews > 0 ? Math.log10(ps.totalReviews + 1) / 3 : 0;
    const verifiedBonus = ps.verified ? 1 : 0;

    const relevanceScore =
      distanceScore * 0.3 +
      ratingScore * 0.25 +
      responseRateScore * 0.2 +
      reviewCountScore * 0.15 +
      verifiedBonus * 0.1;

    return {
      ...ps,
      distance,
      relevanceScore,
    };
  });

  // Sort
  switch (query.sort) {
    case "rating":
      scored.sort((a, b) => b.avgRating - a.avgRating);
      break;
    case "fee_low":
      scored.sort(
        (a, b) =>
          (a.pressStopProfile?.baseFee ?? 0) -
          (b.pressStopProfile?.baseFee ?? 0)
      );
      break;
    case "fee_high":
      scored.sort(
        (a, b) =>
          (b.pressStopProfile?.baseFee ?? 0) -
          (a.pressStopProfile?.baseFee ?? 0)
      );
      break;
    case "distance":
      scored.sort(
        (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );
      break;
    case "relevance":
    default:
      scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;
  }

  // Paginate
  const total = scored.length;
  const paginated = scored.slice(skip, skip + query.limit);

  return c.json({
    data: {
      results: paginated,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

export { discoverRouter };
