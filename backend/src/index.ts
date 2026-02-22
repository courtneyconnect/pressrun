import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { authMiddleware } from "./middleware";
import { usersRouter } from "./routes/users";
import { discoverRouter } from "./routes/discovery";
import { toursRouter } from "./routes/tours";
import { bookingsRouter } from "./routes/bookings";
import { messagesRouter } from "./routes/messages";
import { reviewsRouter } from "./routes/reviews";
import { availabilityRouter } from "./routes/availability";
import { notificationsRouter } from "./routes/notifications";
import { adminRouter } from "./routes/admin";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Auth middleware - extracts user/session from headers
app.use("*", authMiddleware);

// Auth handler - Better Auth handles its own routes
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// File upload endpoint
app.post("/api/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  const storageForm = new FormData();
  storageForm.append("file", file);

  const response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
    method: "POST",
    body: storageForm,
  });

  if (!response.ok) {
    const error = await response.json() as { error?: string };
    return c.json({ error: error.error || "Upload failed" }, 500);
  }

  const result = await response.json() as { file: { id: string; url: string; originalFilename: string; contentType: string; sizeBytes: number } };
  return c.json({ data: result.file });
});

// Mount routes
app.route("/api/users", usersRouter);
app.route("/api/discover", discoverRouter);
app.route("/api/tours", toursRouter);
app.route("/api/bookings", bookingsRouter);
app.route("/api/messages", messagesRouter);
app.route("/api/reviews", reviewsRouter);
app.route("/api/availability", availabilityRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/admin", adminRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
