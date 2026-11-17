export const CURRENCIES = ["ILS", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ENTITY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
