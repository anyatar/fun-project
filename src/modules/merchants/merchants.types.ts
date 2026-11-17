import type { EntityStatus } from "../../shared/types/domain.js";

export interface Merchant {
  id: string;
  name: string;
  status: EntityStatus;
  createdAt: Date;
}
