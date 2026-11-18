-- Revix System — Phase 1 Migration: Core Users, Sessions, Action Tokens & Audit Logs
-- Multi-tenant B2B SaaS Foundation (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (token_hash);

CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_type VARCHAR(32) NOT NULL CHECK (token_type IN ('verify_email', 'reset_password')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_user_type ON auth_action_tokens (user_id, token_type);
CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_hash ON auth_action_tokens (token_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  branch_id UUID NULL,
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(96) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs (actor_user_id, created_at DESC);
