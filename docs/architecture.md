# Revix System Architecture

Revix System is a multi-tenant B2B SaaS platform for car-rental companies, supporting both independent rental businesses and main companies coordinating connected local partner companies.

## Architecture & Implemented Phases

- **Frontend (`frontend/`):** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, `next-intl` (English LTR default and Arabic RTL), and **Redux Toolkit (`@reduxjs/toolkit` + RTK Query + `react-redux`)** for API integration and state management.
- **Backend (`backend/`):** Separate **Node.js + Express + TypeScript** API server (`http://localhost:4000/api/v1`).
- **Database:** **PostgreSQL** (Neon Cloud & Local Postgres) via the official `pg` driver and explicit SQL migrations (`backend/src/db/migrations/`).
- **Phase 1: Core Authentication & Security:**
  - `backend/src/db/migrations/001_auth_and_users.sql`: Core `users`, `user_sessions`, `auth_action_tokens`, and `audit_logs` tables.
  - `backend/src/security/`: Argon2id password hashing, password policy enforcement (12–4096 chars preserving spaces), SHA-256 hashed opaque session/action tokens, and sliding-window rate limiting.
  - `backend/src/modules/auth/`: Endpoints (`/signup`, `/verify-email`, `/resend-verification`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/change-password`, `/me`).
- **Phase 2: Company Setup, Multi-Country Locations & Studio Shell:**
  - `backend/src/db/migrations/002_companies_and_branches.sql`: `companies` and `branches` tables.
  - Company logo uploader with client-side canvas compression (`320x320px`, base64/HTTPS, XSS SVG rejection).
  - Multi-country location manager with automatic currency mapping, per-day working schedule picker (`WorkingSchedulePicker`), and custom dropdowns (`RevixSelect`).
  - Studio navigation shell with icon rail, sub-sidebar, command palette, and hover tooltips (`StudioTooltip`).
- **Phase 3: Team, Roles, Single-Company Membership & 2D RBAC:**
  - `backend/src/db/migrations/003_team_roles_and_invitations.sql`: `company_roles`, `company_memberships`, `member_branch_scopes`, and `employee_invitations` tables.
  - **Single Company per User/Email Rule:** Enforced at database level (`UNIQUE(user_id)` on `company_memberships`) and validated on invite creation and acceptance (`409 EMAIL_ALREADY_IN_COMPANY`).
  - **2D RBAC Engine:** Verifies both Company & Branch scope and Role Permissions across 8 resources (`company`, `branches`, `team`, `fleet`, `sales`, `operations`, `finance`, `network`).
  - **Team Management UI:** `TeamMembersPanel` (team directory, invitations, role & branch scope assignment, suspension with session revocation) and `RolesMatrixPanel` (interactive permissions grid and scope configuration).
  - **Employee Invitation Acceptance:** Public flow at `/invite?token=...` allowing new or existing users to activate membership, set a compliant password, and log in securely.
