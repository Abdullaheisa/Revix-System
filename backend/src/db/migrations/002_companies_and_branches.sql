-- Revix System — Phase 2 Migration: Subscribing Companies & Branches/Locations
-- Multi-tenant B2B SaaS Isolation & Country-Specific Branch Currencies

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  logo_url TEXT NULL,
  brand_color VARCHAR(16) NOT NULL DEFAULT '#14532D',
  phone VARCHAR(48) NOT NULL,
  email VARCHAR(254) NOT NULL,
  country_code CHAR(2) NOT NULL,
  city VARCHAR(120) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(32) NOT NULL DEFAULT '',
  base_currency CHAR(3) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  business_reg_number VARCHAR(96) NOT NULL,
  tax_reg_number VARCHAR(96) NOT NULL DEFAULT '',
  operating_mode VARCHAR(32) NOT NULL DEFAULT 'independent' CHECK (operating_mode IN ('independent', 'network_main', 'local_partner')),
  parent_company_id UUID NULL REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner_user ON companies (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_companies_parent_company ON companies (parent_company_id);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(48) NOT NULL,
  country_code CHAR(2) NOT NULL,
  city VARCHAR(120) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(48) NOT NULL,
  email VARCHAR(254) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  working_days VARCHAR(160) NOT NULL DEFAULT 'Sun - Thu',
  working_hours VARCHAR(64) NOT NULL DEFAULT '08:00 - 22:00',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branch identity is (company_id, LOWER(code)), NEVER physical address
CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_company_code_unique ON branches (company_id, LOWER(code));
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches (company_id);
