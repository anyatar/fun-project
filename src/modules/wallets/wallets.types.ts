import type { Currency, EntityStatus } from "../../shared/types/domain.js";

/** Amounts are integer minor units. */
export interface Wallet {
  id: string;
  merchantId: string;
  currency: Currency;
  initialBalance: number;
  balance: number;
  status: EntityStatus;
  createdAt: Date;
}
