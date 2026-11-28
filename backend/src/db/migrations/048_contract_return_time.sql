ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS return_time TEXT;
