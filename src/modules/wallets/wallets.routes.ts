import { Router } from "express";
import * as controller from "./wallets.controller.js";

export const walletsRouter = Router();

walletsRouter.post("/", controller.createWallet);
walletsRouter.get("/", controller.listWallets);
walletsRouter.get("/:id", controller.getWallet);
walletsRouter.patch("/:id/status", controller.setWalletStatus);
