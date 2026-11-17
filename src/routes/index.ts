import { Router } from "express";
import { merchantsRouter } from "../modules/merchants/merchants.routes.js";
import { transactionsRouter } from "../modules/transactions/transactions.routes.js";
import { walletsRouter } from "../modules/wallets/wallets.routes.js";

export const apiRouter = Router();

apiRouter.use("/merchants", merchantsRouter);
apiRouter.use("/wallets", walletsRouter);
apiRouter.use("/transactions", transactionsRouter);
