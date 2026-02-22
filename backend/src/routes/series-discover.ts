import { Hono } from "hono";
import { prisma } from "../prisma";

const seriesDiscoverRouter = new Hono();

seriesDiscoverRouter.get("/", async (c) => {
  const city = c.req.query("city")?.trim();
  const category = c.req.query("category");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? 20)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { active: true };
  if (category && category !== "ALL") {
    where.category = category;
  }

  const series = await prisma.contentSeries.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  // Filter by creator city if provided (post-filter since SQLite has no good case-insensitive contains)
  const filtered = city
    ? series.filter((s) =>
        s.user.city?.toLowerCase().includes(city.toLowerCase())
      )
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
