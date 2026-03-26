import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const messagesRouter = new Hono<{ Variables: AuthVariables }>();

// GET /conversations - list conversations (grouped by other user)
messagesRouter.get("/conversations", requireAuth, async (c) => {
  const user = c.get("user")!;

  // Get all unique conversation partners
  const sent = await prisma.message.findMany({
    where: { senderId: user.id },
    select: { receiverId: true },
    distinct: ["receiverId"],
  });

  const received = await prisma.message.findMany({
    where: { receiverId: user.id },
    select: { senderId: true },
    distinct: ["senderId"],
  });

  const partnerIds = new Set<string>();
  for (const m of sent) partnerIds.add(m.receiverId);
  for (const m of received) partnerIds.add(m.senderId);

  // For each partner, get the latest message and unread count
  const conversations = await Promise.all(
    Array.from(partnerIds).map(async (partnerId) => {
      const latestMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: user.id, receiverId: partnerId },
            { senderId: partnerId, receiverId: user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const unreadCount = await prisma.message.count({
        where: {
          senderId: partnerId,
          receiverId: user.id,
          read: false,
        },
      });

      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          name: true,
          image: true,
          headline: true,
          role: true,
        },
      });

      return {
        otherUser: partner,
        lastMessage: latestMessage,
        unreadCount,
      };
    })
  );

  // Sort by latest message date
  conversations.sort((a, b) => {
    const aDate = a.lastMessage?.createdAt ?? new Date(0);
    const bDate = b.lastMessage?.createdAt ?? new Date(0);
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return c.json({ data: conversations });
});

// GET /unread-count - get total unread count
messagesRouter.get("/unread-count", requireAuth, async (c) => {
  const user = c.get("user")!;

  const count = await prisma.message.count({
    where: {
      receiverId: user.id,
      read: false,
    },
  });

  return c.json({ data: { count } });
});

// GET /:userId - get messages with a specific user
messagesRouter.get(
  "/:userId",
  requireAuth,
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
  const user = c.get("user")!;
  const otherUserId = c.req.param("userId");
  const { page, limit } = c.req.valid("query");
  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: user.id },
      ],
    },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  // Mark received messages as read
  await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: user.id,
      read: false,
    },
    data: { read: true },
  });

  return c.json({ data: messages });
  }
);

// POST /:userId - send a message
messagesRouter.post(
  "/:userId",
  requireAuth,
  zValidator(
    "json",
    z.object({
      content: z.string().min(1),
      type: z.string().optional().default("TEXT"),
      bookingId: z.string().optional(),
      fileUrl: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const receiverId = c.req.param("userId");
    const body = c.req.valid("json");

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return c.json(
        { error: { message: "User not found", code: "NOT_FOUND" } },
        404
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content: body.content,
        type: body.type,
        bookingId: body.bookingId ?? null,
        fileUrl: body.fileUrl ?? null,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "NEW_MESSAGE",
        title: "New Message",
        body: `${user.name}: ${body.content.substring(0, 100)}`,
        data: JSON.stringify({ senderId: user.id, messageId: message.id }),
      },
    });

    return c.json({ data: message }, 201);
  }
);

// PUT /:messageId/read - mark as read
messagesRouter.put("/:messageId/read", requireAuth, async (c) => {
  const user = c.get("user")!;
  const messageId = c.req.param("messageId");

  const message = await prisma.message.findFirst({
    where: { id: messageId, receiverId: user.id },
  });

  if (!message) {
    return c.json(
      { error: { message: "Message not found", code: "NOT_FOUND" } },
      404
    );
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { read: true },
  });

  return c.json({ data: updated });
});

export { messagesRouter };
