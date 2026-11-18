# Authentication and Security (Phase 1)

Authentication is owned by the Node.js + Express + TypeScript backend (`backend/src/modules/auth/`) and persisted in PostgreSQL.

## Active Controls in Phase 1

- **Password Hashing:** Standard OpenSSL `Argon2id` (`node:crypto`) with 64 MiB memory cost, 3 passes, parallelism 4, and constant-time verification via `crypto.timingSafeEqual`.
- **Password Policy:** 12 to 4096 characters (preserving spaces), requiring uppercase, lowercase, and numeric characters (`frontend/src/lib/auth/passwordPolicy.ts` and `backend/src/security/passwordPolicy.ts`).
- **Session Management:** 256-bit cryptographically random session tokens delivered in `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies. Only the `SHA-256` digest (`token_hash`) is stored in `user_sessions`.
- **Single-Use Action Tokens:** Email verification and password reset tokens are stored only as `SHA-256` hashes in `auth_action_tokens` with expiration timestamps (`expires_at`) and single-use consumption (`consumed_at`), exchanged via `POST` requests.
- **Session Revocation:** Changing or resetting a password automatically revokes all active sessions for that user.
- **Audit Logging:** Authentication and security lifecycle events are recorded in `audit_logs` without logging plaintext passwords or raw tokens.
