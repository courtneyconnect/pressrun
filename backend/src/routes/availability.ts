import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const availabilityRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - get current user's availability
availabilityRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  const [slots, exceptions] = await Promise.all([
    prisma.availability.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  return c.json({ data: { slots, exceptions } });
});

// PUT / - set weekly availability (array of slots)
availabilityRouter.put(
  "/",
  requireAuth,
  zValidator(
    "json",
    z.object({
      slots: z.array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
          isAvailable: z.boolean().optional().default(true),
        })
      ),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    // Replace all slots
    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { userId: user.id } });
      if (body.slots.length > 0) {
        await tx.availability.createMany({
          data: body.slots.map((slot) => ({
            userId: user.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable: slot.isAvailable,
          })),
        });
      }
    });

    const slots = await prisma.availability.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return c.json({ data: slots });
  }
);

// POST /exceptions - add exception date
availabilityRouter.post(
  "/exceptions",
  requireAuth,
  zValidator(
    "json",
    z.object({
      date: z.string(),
      isAvailable: z.boolean().optional().default(false),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      reason: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const exception = await prisma.availabilityException.create({
      data: {
        userId: user.id,
        date: new Date(body.date),
        isAvailable: body.isAvailable,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        reason: body.reason ?? null,
      },
    });

    return c.json({ data: exception }, 201);
  }
);

// DELETE /exceptions/:id - remove exception
availabilityRouter.delete("/exceptions/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const exception = await prisma.availabilityException.findFirst({
    where: { id, userId: user.id },
  });

  if (!exception) {
    return c.json(
      { error: { message: "Exception not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.availabilityException.delete({ where: { id } });

  return c.json({ data: { success: true } });
});

// GET /user/:userId - get public availability for a user
availabilityRouter.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");

  const [slots, exceptions] = await Promise.all([
    prisma.availability.findMany({
      where: { userId, isAvailable: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: {
        userId,
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  return c.json({ data: { slots, exceptions } });
});

// GET /check - check if a user is available at a specific date/time
availabilityRouter.get("/check", async (c) => {
  const userId = c.req.query("userId");
  const date = c.req.query("date");
  const time = c.req.query("time");

  if (!userId || !date) {
    return c.json(
      {
        error: {
          message: "userId and date are required",
          code: "VALIDATION_ERROR",
        },
      },
      400
    );
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getUTCDay();

  // Check for exceptions on this date
  const exception = await prisma.availabilityException.findFirst({
    where: {
      userId,
      date: {
        gte: new Date(targetDate.toISOString().split("T")[0]!),
        lt: new Date(
          new Date(targetDate.getTime() + 86400000)
            .toISOString()
            .split("T")[0]!
        ),
      },
    },
  });

  if (exception) {
    if (!exception.isAvailable) {
      return c.json({
        data: { available: false, reason: exception.reason ?? "Unavailable on this date" },
      });
    }
    // If exception says available, check time
    if (time && exception.startTime && exception.endTime) {
      const available = time >= exception.startTime && time <= exception.endTime;
      return c.json({ data: { available } });
    }
    return c.json({ data: { available: true } });
  }

  // Check regular weekly availability
  const slots = await prisma.availability.findMany({
    where: {
      userId,
      dayOfWeek,
      isAvailable: true,
    },
  });

  if (slots.length === 0) {
    return c.json({ data: { available: false, reason: "No availability on this day" } });
  }

  if (time) {
    const available = slots.some(
      (slot) => time >= slot.startTime && time <= slot.endTime
    );
    return c.json({ data: { available } });
  }

  return c.json({ data: { available: true } });
});

export { availabilityRouter };
