# Revix System Architecture

Revix System is a multi-tenant B2B SaaS platform for car-rental companies, supporting both independent rental businesses and main companies coordinating connected local partner companies.

## Current Stack & Phase 1 Scope

- **Frontend (`frontend/`):** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, `next-intl` (English LTR default and Arabic RTL), and **Redux Toolkit (`@reduxjs/toolkit` + RTK Query + `react-redux`)** for API integration and state management.
- **Backend (`backend/`):** Separate **Node.js + Express + TypeScript** API server (`http://localhost:4000/api/v1`).
- **Database:** **PostgreSQL** via the official `pg` driver and explicit SQL migrations (`backend/src/db/migrations/`). Neither Firebase nor Supabase is used.
- **Phase 1 Modules:**
  - `backend/src/db/migrations/001_auth_and_users.sql`: Core `users`, `user_sessions`, `auth_action_tokens`, and `audit_logs` tables.
  - `backend/src/security/`: Argon2id password hashing (`node:crypto`), password policy enforcement (12–4096 chars preserving spaces), SHA-256 hashed opaque session/action tokens, and sliding-window rate limiting.
  - `backend/src/modules/auth/`: Backend-owned authentication endpoints (`/signup`, `/verify-email`, `/resend-verification`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/change-password`, `/me`).
  - `frontend/src/store/`: Redux Toolkit store, `baseApi`, `authApi`, and `authSlice` connecting all frontend auth views to the Express API.
