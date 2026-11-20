-- ==============================================================================
-- 010_network_invitation_details.sql
-- Adds optional contact person name, phone, and company logo to network invites.
-- ==============================================================================

ALTER TABLE company_network_invitations
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
