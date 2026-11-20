-- Revix System — Phase 3 Migration: Team Memberships, Configurable Roles, Branch Scopes & Employee Invitations
-- Enforces: 1 company per email/user (UNIQUE user_id), 1 role per employee, 2D (Company × Branch × Role) RBAC

CREATE TABLE IF NOT EXISTS company_roles (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  scope_type VARCHAR(32) NOT NULL CHECK (scope_type IN ('company_wide', 'assigned_branches')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_roles_company_code_unique
  ON company_roles (company_id, LOWER(code));
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id
  ON company_roles (company_id);

CREATE TABLE IF NOT EXISTS company_memberships (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES company_roles(id) ON DELETE RESTRICT,
  phone VARCHAR(48) NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id
  ON company_memberships (company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_role_id
  ON company_memberships (role_id);

CREATE TABLE IF NOT EXISTS member_branch_scopes (
  membership_id UUID NOT NULL REFERENCES company_memberships(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (membership_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_member_branch_scopes_branch_id
  ON member_branch_scopes (branch_id);

CREATE TABLE IF NOT EXISTS employee_invitations (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(48) NOT NULL DEFAULT '',
  role_id UUID NOT NULL REFERENCES company_roles(id) ON DELETE RESTRICT,
  branch_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_id
  ON employee_invitations (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email_lower
  ON employee_invitations (LOWER(email));
