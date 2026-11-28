ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS partner_slug TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_partner_slug
  ON companies(partner_slug)
  WHERE partner_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_website_url TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'book', 'cancel'],
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_api_keys_company
  ON partner_api_keys(company_id, created_at DESC);

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS partner_key_id UUID NULL REFERENCES partner_api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_name TEXT NULL;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS partner_key_id UUID NULL REFERENCES partner_api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_name TEXT NULL;
