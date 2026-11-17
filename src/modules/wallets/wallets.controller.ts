import type { Request, Response } from "express";
import { idParamsSchema, parseInput, statusBodySchema } from "../../shared/http/validation.js";
import { createWalletBodySchema } from "./wallets.schemas.js";
import * as walletsService from "./wallets.service.js";

export async function createWallet(req: Request, res: Response): Promise<void> {
  const body = parseInput(createWalletBodySchema, req.body);
  res.status(201).json({ data: await walletsService.createWallet(body) });
}

export async function listWallets(_req: Request, res: Response): Promise<void> {
  res.json({ data: await walletsService.listWallets() });
}

export async function getWallet(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(idParamsSchema, req.params);
  res.json({ data: await walletsService.getWallet(id) });
}

export async function setWalletStatus(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(idParamsSchema, req.params);
  const { status } = parseInput(statusBodySchema, req.body);
  res.json({ data: await walletsService.setWalletStatus(id, status) });
}
