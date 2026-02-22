import { Hono } from "hono";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const notificationsRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - list user's notifications
notificationsRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: user.id } }),
  ]);

  return c.json({
    data: {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// PUT /:id/read - mark notification as read
notificationsRouter.put("/:id/read", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });

  if (!notification) {
    return c.json(
      { error: { message: "Notification not found", code: "NOT_FOUND" } },
      404
    );
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return c.json({ data: updated });
});

// PUT /read-all - mark all as read
notificationsRouter.put("/read-all", requireAuth, async (c) => {
  const user = c.get("user")!;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return c.json({ data: { success: true } });
});

// GET /unread-count - get unread count
notificationsRouter.get("/unread-count", requireAuth, async (c) => {
  const user = c.get("user")!;

  const count = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return c.json({ data: { count } });
});

export { notificationsRouter };
