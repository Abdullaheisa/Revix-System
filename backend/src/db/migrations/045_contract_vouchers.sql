-- ==============================================================================
-- 045_contract_vouchers.sql
-- Store receipt, payment, and refund vouchers linked to rental contracts.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS contract_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
  voucher_number TEXT NOT NULL,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('receipt', 'payment', 'refund')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency_code TEXT NOT NULL DEFAULT 'EGP',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'knet', 'link', 'bank_transfer', 'cheque')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_no TEXT,
  bank_name TEXT,
  description TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, voucher_number)
);

CREATE INDEX IF NOT EXISTS idx_contract_vouchers_contract
  ON contract_vouchers (company_id, contract_id, created_at DESC);
