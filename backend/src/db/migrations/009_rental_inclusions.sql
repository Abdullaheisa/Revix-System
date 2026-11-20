-- ==============================================================================
-- 009_rental_inclusions.sql
-- Revix System Phase 5 Extended: Rental Inclusions & Contract Benefits Catalog
-- Dedicated catalog for "What is Included" features in rental contracts.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rental_inclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_inclusions_company ON rental_inclusions(company_id);
CREATE INDEX IF NOT EXISTS idx_rental_inclusions_active ON rental_inclusions(company_id, is_active);
