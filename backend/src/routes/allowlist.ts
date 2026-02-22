import { Hono } from "hono";
import { prisma } from "../prisma";

const allowlistRouter = new Hono();

// GET /api/allowlist - list all entries
allowlistRouter.get("/", async (c) => {
  const entries = await prisma.betaAllowlist.findMany({ orderBy: { createdAt: "asc" } });
  return c.json({ data: entries });
});

// POST /api/allowlist - add or update email
allowlistRouter.post("/", async (c) => {
  const { email, note } = await c.req.json<{ email: string; note?: string }>();
  if (!email) return c.json({ error: { message: "Email required" } }, 400);
  const entry = await prisma.betaAllowlist.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { note },
    create: { email: email.toLowerCase().trim(), note },
  });
  return c.json({ data: entry });
});

// DELETE /api/allowlist/:email - remove email
allowlistRouter.delete("/:email", async (c) => {
  const email = decodeURIComponent(c.req.param("email"));
  try {
    await prisma.betaAllowlist.delete({ where: { email: email.toLowerCase().trim() } });
    return c.json({ data: { deleted: true } });
  } catch {
    return c.json({ error: { message: "Not found" } }, 404);
  }
});

export { allowlistRouter };
