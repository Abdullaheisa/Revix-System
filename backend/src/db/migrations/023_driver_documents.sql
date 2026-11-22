-- 023: Driver national ID and document photos (ID card, passport, license)

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS national_id_number TEXT,
  ADD COLUMN IF NOT EXISTS id_card_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS license_photo_url TEXT;
