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
import { seriesDiscoverRouter } from "./routes/series-discover";
import { publicToursRouter } from "./routes/public-tours";
import { paymentsRouter } from "./routes/payments";

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
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch (e) {
    console.error("[upload] Failed to parse form data:", e);
    return c.json({ error: "Failed to parse form data" }, 400);
  }

  const file = formData.get("file");

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Accept File or any object with arrayBuffer (covers Blob-like objects from Bun)
  if (!(file instanceof File) && typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function") {
    return c.json({ error: "Invalid file field" }, 400);
  }

  const storageForm = new FormData();
  storageForm.append("file", file);

  let response: Response;
  try {
    response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
      method: "POST",
      body: storageForm,
    });
  } catch (e) {
    console.error("[upload] Storage fetch error:", e);
    return c.json({ error: "Storage service unreachable" }, 502);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("[upload] Storage error:", response.status, text);
    let errorMsg = "Upload failed";
    try { errorMsg = (JSON.parse(text) as { error?: string }).error ?? errorMsg; } catch { /* ignore */ }
    return c.json({ error: errorMsg }, 500);
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
app.route("/api/series-discover", seriesDiscoverRouter);
app.route("/api/public-tours", publicToursRouter);
app.route("/api/payments", paymentsRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
  // Allow up to 500 MB so large video uploads don't get rejected with 413
  maxRequestBodySize: 500 * 1024 * 1024,
  // 10 min idle timeout — default 10s causes large video uploads to abort mid-stream
  idleTimeout: 600,
};
