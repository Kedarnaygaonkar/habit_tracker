import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "../backend/app";

// Cache the handler across warm invocations to avoid re-initializing the DB on every request
let handler: ReturnType<typeof serverless>;

export default async function (req: any, res: any) {
  if (!handler) {
    const app = await createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
