import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware";
import type { AuthVariables } from "../middleware";

const adminRouter = new Hono<{ Variables: AuthVariables }>();

// All admin routes require admin role
adminRouter.use("*", requireAdmin);

// GET /users - list all users with filters
adminRouter.get("/users", async (c) => {
  const role = c.req.query("role");
  const verified = c.req.query("verified");
  const search = c.req.query("search");
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (role) {
    where.role = role;
  }

  if (verified !== undefined) {
    where.verified = verified === "true";
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { city: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as any,
      include: {
        talentProfile: true,
        pressStopProfile: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: where as any }),
  ]);

  return c.json({
    data: {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PUT /users/:id/verify - verify a user
adminRouter.put(
  "/users/:id/verify",
  zValidator(
    "json",
    z.object({
      verified: z.boolean(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return c.json(
        { error: { message: "User not found", code: "NOT_FOUND" } },
        404
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { verified: body.verified },
    });

    return c.json({ data: updated });
  }
);

// PUT /users/:id/ban - ban/unban a user (we use emailVerified false as a ban mechanism)
adminRouter.put(
  "/users/:id/ban",
  zValidator(
    "json",
    z.object({
      banned: z.boolean(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return c.json(
        { error: { message: "User not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Use a convention: banned users have role set to "BANNED"
    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: body.banned ? "BANNED" : user.role === "BANNED" ? "TALENT" : user.role,
      },
    });

    return c.json({ data: updated });
  }
);

// GET /bookings - list all bookings
adminRouter.get("/bookings", async (c) => {
  const status = c.req.query("status");
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: where as any,
      include: {
        talent: {
          select: { id: true, name: true, email: true, image: true },
        },
        pressStop: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: where as any }),
  ]);

  return c.json({
    data: {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /reports - list all reports
adminRouter.get("/reports", async (c) => {
  const status = c.req.query("status");
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: where as any,
      include: {
        reporter: {
          select: { id: true, name: true, email: true, image: true },
        },
        reported: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.report.count({ where: where as any }),
  ]);

  return c.json({
    data: {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PUT /reports/:id - resolve a report
adminRouter.put(
  "/reports/:id",
  zValidator(
    "json",
    z.object({
      status: z.enum(["RESOLVED", "DISMISSED"]),
      adminNotes: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return c.json(
        { error: { message: "Report not found", code: "NOT_FOUND" } },
        404
      );
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: body.status,
        adminNotes: body.adminNotes ?? null,
        resolvedAt: new Date(),
      },
    });

    return c.json({ data: updated });
  }
);

// GET /stats - dashboard stats
adminRouter.get("/stats", async (c) => {
  const [
    totalUsers,
    totalTalent,
    totalPressStops,
    totalBookings,
    completedBookings,
    pendingBookings,
    totalReviews,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TALENT" } }),
    prisma.user.count({ where: { role: "PRESS_STOP" } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.review.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
  ]);

  // Calculate total revenue from completed bookings
  const revenueResult = await prisma.booking.aggregate({
    where: { status: "COMPLETED" },
    _sum: { platformFee: true },
  });

  return c.json({
    data: {
      totalUsers,
      totalTalent,
      totalPressStops,
      totalBookings,
      completedBookings,
      pendingBookings,
      totalReviews,
      pendingReports,
      totalRevenue: revenueResult._sum.platformFee ?? 0,
    },
  });
});

export { adminRouter };
