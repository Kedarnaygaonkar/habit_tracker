// NOTE: No dotenv needed — Vercel injects env vars automatically.
// dotenv is only needed in server.ts for local development.
import serverless from "serverless-http";
import { createApp } from "../backend/app.js";

// Cache the handler across warm invocations (avoids re-initializing DB on every request)
let handler: ReturnType<typeof serverless> | null = null;

export default async function (req: any, res: any) {
  try {
    if (!handler) {
      const app = await createApp();
      handler = serverless(app);
    }
    return await handler(req, res);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    // Return a proper JSON error instead of Vercel's default plain-text 500
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error", detail: err?.message || "Unknown error" }));
  }
}
