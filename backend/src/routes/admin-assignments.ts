import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { AuthVariables } from "../middleware";

const adminAssignmentsRouter = new Hono<{ Variables: AuthVariables }>();

// GET / - list my admin assignments (as creator or as admin)
adminAssignmentsRouter.get("/", requireAuth, async (c) => {
  const user = c.get("user")!;

  const [asCreator, asAdmin] = await Promise.all([
    prisma.adminAssignment.findMany({
      where: { creatorId: user.id, active: true },
      include: { admin: { select: { id: true, name: true, image: true, email: true } } },
    }),
    prisma.adminAssignment.findMany({
      where: { adminId: user.id, active: true },
      include: { creator: { select: { id: true, name: true, image: true, headline: true } } },
    }),
  ]);

  return c.json({ data: { asCreator, asAdmin } });
});

// POST / - assign admin (creator assigns someone as their admin)
adminAssignmentsRouter.post("/", requireAuth, zValidator("json", z.object({
  adminUserId: z.string(),
  feePercent: z.number().min(2).max(50).optional().default(2),
})), async (c) => {
  const user = c.get("user")!;
  const body = c.req.valid("json");

  if (user.id === body.adminUserId) return c.json({ error: { message: "Cannot assign yourself", code: "INVALID" } }, 400);

  const assignment = await prisma.adminAssignment.upsert({
    where: { creatorId_adminId: { creatorId: user.id, adminId: body.adminUserId } },
    create: { creatorId: user.id, adminId: body.adminUserId, feePercent: body.feePercent, active: true },
    update: { feePercent: body.feePercent, active: true },
    include: { admin: { select: { id: true, name: true, image: true } } },
  });
  return c.json({ data: assignment }, 201);
});

// PUT /:id - update fee percent
adminAssignmentsRouter.put("/:id", requireAuth, zValidator("json", z.object({
  feePercent: z.number().min(2).max(50),
})), async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const assignment = await prisma.adminAssignment.findFirst({
    where: { id, creatorId: user.id },
  });
  if (!assignment) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const updated = await prisma.adminAssignment.update({
    where: { id },
    data: { feePercent: body.feePercent },
  });
  return c.json({ data: updated });
});

// DELETE /:id - remove admin assignment
adminAssignmentsRouter.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");

  const assignment = await prisma.adminAssignment.findFirst({
    where: { id, creatorId: user.id },
  });
  if (!assignment) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  await prisma.adminAssignment.update({ where: { id }, data: { active: false } });
  return c.json({ data: { success: true } });
});

export { adminAssignmentsRouter };
