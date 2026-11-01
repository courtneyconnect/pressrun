// Preview only: hands back a sign-up code and the pre-typed text, like the real
// server does, but saves nothing. The real sign-up runs on the Press Run server.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Use POST", code: "method" } });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!String(body.name || "").trim()) return res.status(400).json({ error: { message: "Name is required", code: "name_required" } });
  const code = "PR-" + Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
  const message = body.intent === "stop" ? `Hey Press Run 👋 List my show. Code ${code}` : `Hey Press Run 👋 Sign me up. Code ${code}`;
  res.status(200).json({ data: { code, message } });
}
