import type { Request, Response } from "express";
import { idParamsSchema, parseInput, statusBodySchema } from "../../shared/http/validation.js";
import { createMerchantBodySchema } from "./merchants.schemas.js";
import * as merchantsService from "./merchants.service.js";

export async function createMerchant(req: Request, res: Response): Promise<void> {
  const body = parseInput(createMerchantBodySchema, req.body);
  res.status(201).json({ data: await merchantsService.createMerchant(body.name) });
}

export async function listMerchants(_req: Request, res: Response): Promise<void> {
  res.json({ data: await merchantsService.listMerchants() });
}

export async function getMerchant(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(idParamsSchema, req.params);
  res.json({ data: await merchantsService.getMerchant(id) });
}

export async function setMerchantStatus(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(idParamsSchema, req.params);
  const { status } = parseInput(statusBodySchema, req.body);
  res.json({ data: await merchantsService.setMerchantStatus(id, status) });
}
