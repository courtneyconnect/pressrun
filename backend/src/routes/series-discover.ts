import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";

const seriesDiscoverRouter = new Hono();

seriesDiscoverRouter.get(
  "/",
  zValidator(
    "query",
    z.object({
      city: z.string().optional(),
      category: z.string().optional(),
      type: z.string().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(200).optional().default(100),
    })
  ),
  async (c) => {
  const { city: rawCity, category, type, page, limit } = c.req.valid("query");
  const city = rawCity?.trim();
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { active: true };
  if (category && category !== "ALL") {
    where.category = category;
  } else if (type && type !== "ALL") {
    // ?type= is an alias for filtering by category (press stop type)
    where.category = type;
  }

  const series = await prisma.contentSeries.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          state: true,
          verified: true,
          avgRating: true,
          totalReviews: true,
          headline: true,
          role: true,
        },
      },
    },
  });

  // Filter by creator city or series cities if provided (post-filter since SQLite has no good case-insensitive contains)
  const filtered = city
    ? series.filter((s) => {
        const creatorCityMatch = s.user.city?.toLowerCase().includes(city.toLowerCase());
        let seriesCityMatch = false;
        if (s.cities) {
          try {
            const cityArr = JSON.parse(s.cities) as string[];
            seriesCityMatch = cityArr.some((c) => c.toLowerCase().includes(city.toLowerCase()));
          } catch {}
        }
        return creatorCityMatch || seriesCityMatch;
      })
    : series;

  const result = filtered.map(({ user, ...s }) => ({ series: s, creator: user }));

  return c.json({ data: result });
  }
);

// GET /:id - get a single series with creator info
seriesDiscoverRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const series = await prisma.contentSeries.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          state: true,
          verified: true,
          avgRating: true,
          totalReviews: true,
          headline: true,
          role: true,
          profileComplete: true,
        },
      },
    },
  });

  if (!series) {
    return c.json({ error: { message: "Series not found", code: "NOT_FOUND" } }, 404);
  }

  const { user, ...seriesData } = series;
  return c.json({ data: { series: seriesData, creator: user } });
});

export { seriesDiscoverRouter };
