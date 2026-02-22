import { createMiddleware } from "hono/factory";
import type { auth } from "./auth";

type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

export type { AuthVariables };

export const authMiddleware = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const { auth: authInstance } = await import("./auth");
  const session = await authInstance.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }
  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }
  return next();
});

export const requireAdmin = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }
  const { prisma } = await import("./prisma");
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") {
    return c.json(
      { error: { message: "Forbidden", code: "FORBIDDEN" } },
      403
    );
  }
  return next();
});
