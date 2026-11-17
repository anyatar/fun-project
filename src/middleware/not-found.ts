import type { RequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.js";

export const notFoundHandler: RequestHandler = () => {
  throw new AppError("ROUTE_NOT_FOUND", 404, "Route not found");
};
