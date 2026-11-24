CREATE TABLE IF NOT EXISTS vehicle_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  color_type VARCHAR(32) NOT NULL DEFAULT 'exterior',
  name_en VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  hex_code VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_colors_company ON vehicle_colors(company_id);

CREATE TABLE IF NOT EXISTS vehicle_body_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  sipp_prefix VARCHAR(8) NOT NULL DEFAULT 'I',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_body_styles_company ON vehicle_body_styles(company_id);

CREATE TABLE IF NOT EXISTS fleet_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  price_list_type VARCHAR(64) NOT NULL DEFAULT 'spot',
  currency_code VARCHAR(16) NOT NULL,
  effective_from DATE,
  effective_to DATE,
  price_type VARCHAR(64) NOT NULL DEFAULT 'daily_bands',
  remarks TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_price_lists_company ON fleet_price_lists(company_id);
