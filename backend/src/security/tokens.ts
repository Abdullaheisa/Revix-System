import crypto from "node:crypto";

/**
 * Generates a high-entropy 256-bit cryptographically random token encoded as base64url.
 * Used for session identifiers, email verification tokens, password reset tokens, and invitations.
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/**
 * Computes the SHA-256 hex digest of a raw token.
 * Only the SHA-256 hash is persisted in PostgreSQL (`user_sessions`, `auth_action_tokens`)
 * so raw credentials cannot be recovered from database rows or backups.
 */
export function hashOpaqueToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken, "utf8").digest("hex");
}
