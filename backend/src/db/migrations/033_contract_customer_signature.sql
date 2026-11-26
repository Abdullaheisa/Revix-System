ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS customer_signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
