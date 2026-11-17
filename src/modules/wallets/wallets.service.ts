import { pool } from "../../infrastructure/database/pool.js";
import { notFound } from "../../shared/errors/app-error.js";
import type { EntityStatus } from "../../shared/types/domain.js";
import { findMerchantById } from "../merchants/merchants.repository.js";
import * as walletsRepository from "./wallets.repository.js";
import type { NewWallet } from "./wallets.repository.js";
import type { Wallet } from "./wallets.types.js";

export async function createWallet(input: NewWallet): Promise<Wallet> {
  // Merchants are never deleted, so this check cannot race with a removal.
  // Creating a wallet for an INACTIVE merchant is allowed (charges are declined anyway).
  const merchant = await findMerchantById(pool, input.merchantId);
  if (!merchant) throw notFound("MERCHANT_NOT_FOUND", "Merchant not found");
  return await walletsRepository.insertWallet(pool, input);
}

export async function listWallets(): Promise<Wallet[]> {
  return await walletsRepository.listWallets(pool);
}

export async function getWallet(id: string): Promise<Wallet> {
  const wallet = await walletsRepository.findWalletById(pool, id);
  if (!wallet) throw notFound("WALLET_NOT_FOUND", "Wallet not found");
  return wallet;
}

export async function setWalletStatus(id: string, status: EntityStatus): Promise<Wallet> {
  const wallet = await walletsRepository.updateWalletStatus(pool, id, status);
  if (!wallet) throw notFound("WALLET_NOT_FOUND", "Wallet not found");
  return wallet;
}
