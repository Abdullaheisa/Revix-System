-- ==============================================================================
-- 004_company_network_links.sql
-- Revix System Phase 4: Company Network (Main Company <-> Local Partner Companies)
-- Strict view-only vehicle & branch visibility, isolated partner workspaces.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS company_network_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    local_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'terminated')),
    permitted_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_network_main_local UNIQUE (main_company_id, local_company_id),
    CONSTRAINT chk_network_different_companies CHECK (main_company_id <> local_company_id)
);

CREATE INDEX IF NOT EXISTS idx_network_links_main ON company_network_links(main_company_id);
CREATE INDEX IF NOT EXISTS idx_network_links_local ON company_network_links(local_company_id);
CREATE INDEX IF NOT EXISTS idx_network_links_status ON company_network_links(status);

CREATE TABLE IF NOT EXISTS network_permitted_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES company_network_links(id) ON DELETE CASCADE,
    local_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_network_link_branch UNIQUE (link_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_permitted_branches_link ON network_permitted_branches(link_id);
CREATE INDEX IF NOT EXISTS idx_permitted_branches_branch ON network_permitted_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_permitted_branches_local ON network_permitted_branches(local_company_id);

CREATE TABLE IF NOT EXISTS company_network_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    local_company_name VARCHAR(120) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_invites_main ON company_network_invitations(main_company_id);
CREATE INDEX IF NOT EXISTS idx_network_invites_email ON company_network_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_network_invites_token ON company_network_invitations(token_hash);
