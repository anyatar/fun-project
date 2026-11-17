import { pool } from "../../infrastructure/database/pool.js";
import { notFound } from "../../shared/errors/app-error.js";
import type { EntityStatus } from "../../shared/types/domain.js";
import * as merchantsRepository from "./merchants.repository.js";
import type { Merchant } from "./merchants.types.js";

export async function createMerchant(name: string): Promise<Merchant> {
  return await merchantsRepository.insertMerchant(pool, name);
}

export async function listMerchants(): Promise<Merchant[]> {
  return await merchantsRepository.listMerchants(pool);
}

export async function getMerchant(id: string): Promise<Merchant> {
  const merchant = await merchantsRepository.findMerchantById(pool, id);
  if (!merchant) throw notFound("MERCHANT_NOT_FOUND", "Merchant not found");
  return merchant;
}

export async function setMerchantStatus(id: string, status: EntityStatus): Promise<Merchant> {
  const merchant = await merchantsRepository.updateMerchantStatus(pool, id, status);
  if (!merchant) throw notFound("MERCHANT_NOT_FOUND", "Merchant not found");
  return merchant;
}
