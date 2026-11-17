import express from "express";
import type { Express } from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestId } from "./middleware/request-id.js";
import { apiRouter } from "./routes/index.js";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestId);
  app.use(express.json({ limit: "10kb" }));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
