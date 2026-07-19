import { createApp } from "../backend/app.js";

// Cache the Express app across warm invocations
let app: any = null;

export default async function (req: any, res: any) {
  try {
    if (!app) {
      app = await createApp();
    }
    // Pass Vercel's req/res natively into Express
    return app(req, res);
  } catch (err: any) {
    console.error("Serverless handler error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal server error", detail: err?.message || "Unknown error" }));
  }
}
