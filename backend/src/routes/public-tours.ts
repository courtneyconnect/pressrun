import { Hono } from "hono";
import { prisma } from "../prisma";
import type { AuthVariables } from "../middleware";

const publicToursRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - list all active public tours (for press stops to discover talent coming to their area)
publicToursRouter.get("/", async (c) => {
  const city = c.req.query("city")?.trim();
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? 20)));
  const skip = (page - 1) * limit;

  const tours = await prisma.tour.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      talent: {
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
          talentProfile: true,
        },
      },
      stops: {
        orderBy: { order: "asc" },
      },
    },
  });

  // Filter by city match in any stop if city provided
  const filtered = city
    ? tours.filter((t) =>
        t.stops.some((s) =>
          s.city.toLowerCase().includes(city.toLowerCase())
        )
      )
    : tours;

  return c.json({ data: filtered });
});

export { publicToursRouter };
