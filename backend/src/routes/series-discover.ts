import { Hono } from "hono";
import { prisma } from "../prisma";

const seriesDiscoverRouter = new Hono();

seriesDiscoverRouter.get("/", async (c) => {
  const city = c.req.query("city")?.trim();
  const category = c.req.query("category");
  const type = c.req.query("type");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 100)));
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
});

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
