import { Router } from "express";
import * as controller from "./merchants.controller.js";

export const merchantsRouter = Router();

merchantsRouter.post("/", controller.createMerchant);
merchantsRouter.get("/", controller.listMerchants);
merchantsRouter.get("/:id", controller.getMerchant);
merchantsRouter.patch("/:id/status", controller.setMerchantStatus);
