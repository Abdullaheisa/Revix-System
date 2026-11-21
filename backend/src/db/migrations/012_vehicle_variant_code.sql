ALTER TABLE vehicle_variants
  ADD COLUMN IF NOT EXISTS variant_code TEXT;

UPDATE vehicle_variants
SET variant_code = 'V' || (100 + (abs(hashtext(id::text)) % 900))::text
WHERE variant_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_variants_company_code
  ON vehicle_variants (company_id, variant_code);
