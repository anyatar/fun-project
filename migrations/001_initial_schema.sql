-- Money columns are BIGINT minor units (agorot / cents). See docs/decisions/ADR-002.

CREATE TABLE merchants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  status     text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES merchants (id),
  currency        text NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
  initial_balance bigint NOT NULL CHECK (initial_balance >= 0),
  balance         bigint NOT NULL CHECK (balance >= 0),
  status          text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallets_merchant_id_idx ON wallets (merchant_id);

CREATE TABLE transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    text NOT NULL CHECK (type IN ('CHARGE', 'REFUND')),
  wallet_id               uuid NOT NULL REFERENCES wallets (id),
  merchant_id             uuid NOT NULL REFERENCES merchants (id),
  amount                  bigint NOT NULL CHECK (amount > 0),
  currency                text NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
  status                  text NOT NULL CHECK (status IN ('APPROVED', 'DECLINED')),
  decline_reason          text,
  original_transaction_id uuid REFERENCES transactions (id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'DECLINED') = (decline_reason IS NOT NULL)),
  CHECK ((type = 'REFUND') = (original_transaction_id IS NOT NULL))
);
CREATE INDEX transactions_wallet_id_idx ON transactions (wallet_id);
CREATE INDEX transactions_merchant_id_idx ON transactions (merchant_id);
CREATE INDEX transactions_original_transaction_id_idx ON transactions (original_transaction_id);

-- Signed amount: CHARGE is negative, REFUND is positive.
-- Invariant: wallets.initial_balance + SUM(ledger_entries.amount) = wallets.balance
CREATE TABLE ledger_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      uuid NOT NULL REFERENCES wallets (id),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions (id),
  type           text NOT NULL CHECK (type IN ('CHARGE', 'REFUND')),
  amount         bigint NOT NULL CHECK (amount <> 0),
  currency       text NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'CHARGE' AND amount < 0) OR (type = 'REFUND' AND amount > 0))
);
CREATE INDEX ledger_entries_wallet_id_idx ON ledger_entries (wallet_id);

CREATE FUNCTION forbid_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$;

CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

-- See docs/decisions/ADR-004.
CREATE TABLE idempotency_keys (
  scope          text NOT NULL CHECK (scope IN ('CHARGE', 'REFUND')),
  key            text NOT NULL,
  request_hash   text NOT NULL,
  transaction_id uuid REFERENCES transactions (id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);
