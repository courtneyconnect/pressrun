import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const friendsRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - list my friends (accepted) + pending requests
friendsRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  const [requested, received] = await Promise.all([
    prisma.friendship.findMany({
      where: { requesterId: user.id },
      include: { addressee: { select: { id: true, name: true, image: true, headline: true, verified: true } } },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: user.id },
      include: { requester: { select: { id: true, name: true, image: true, headline: true, verified: true } } },
    }),
  ]);

  return c.json({ data: { requested, received } });
});

// POST /request - send friend request
friendsRouter.post("/request", requireAuth, zValidator("json", z.object({
  userId: z.string(),
})), async (c) => {
  const user = c.get("user")!;
  const body = c.req.valid("json");

  if (user.id === body.userId) return c.json({ error: { message: "Cannot add yourself", code: "INVALID" } }, 400);

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: body.userId },
        { requesterId: body.userId, addresseeId: user.id },
      ],
    },
  });
  if (existing) return c.json({ data: existing });

  const friendship = await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: body.userId },
  });

  // Notify the recipient of the friend request
  await prisma.notification.create({
    data: {
      userId: body.userId,
      type: "FRIEND_REQUEST",
      title: "New Friend Request",
      body: `${user.name ?? "Someone"} sent you a friend request`,
      data: JSON.stringify({ friendshipId: friendship.id, requesterId: user.id }),
    },
  });

  return c.json({ data: friendship }, 201);
});

// PUT /:id/accept - accept friend request
friendsRouter.put("/:id/accept", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const friendship = await prisma.friendship.findFirst({
    where: { id, addresseeId: user.id, status: "PENDING" },
  });
  if (!friendship) return c.json({ error: { message: "Request not found", code: "NOT_FOUND" } }, 404);

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  // Notify the original requester that their request was accepted
  await prisma.notification.create({
    data: {
      userId: friendship.requesterId,
      type: "FRIEND_ACCEPTED",
      title: "Friend Request Accepted",
      body: `${user.name ?? "Someone"} accepted your friend request`,
      data: JSON.stringify({ friendshipId: id, addresseeId: user.id }),
    },
  });

  return c.json({ data: updated });
});

// DELETE /:id - decline or remove friendship
friendsRouter.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const friendship = await prisma.friendship.findFirst({
    where: { id, OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
  });
  if (!friendship) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  await prisma.friendship.delete({ where: { id } });
  return c.json({ data: { success: true } });
});

export { friendsRouter };
