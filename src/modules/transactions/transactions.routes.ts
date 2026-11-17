import { Router } from "express";
import * as controller from "./transactions.controller.js";

export const transactionsRouter = Router();

transactionsRouter.post("/charge", controller.charge);
transactionsRouter.post("/refund", controller.refund);
transactionsRouter.get("/", controller.listTransactions);
transactionsRouter.get("/:id", controller.getTransaction);
