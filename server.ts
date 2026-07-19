/**
 * Local development server only.
 * On Vercel, api/index.ts is used instead.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createApp } from "./backend/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startDev() {
  const app = await createApp();

  // Vite dev middleware (HMR, module serving)
  const vite = await createViteServer({
    root: path.resolve(__dirname, "frontend"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HabitQuest dev server running on http://localhost:${PORT}`);
  });
}

startDev();
