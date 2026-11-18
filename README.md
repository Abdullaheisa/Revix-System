# Revix System 🚗🏢

> **Enterprise B2B SaaS Platform for Car Rental & Fleet Operations**  
> Built with Next.js 15, React 19, Redux Toolkit, Node.js + Express 5 (TypeScript), and PostgreSQL.

---

## 🌟 Overview

**Revix System** is a unified, multi-tenant car rental management platform designed to streamline sales, fleet operations, contracts, and finance. It supports both independent car rental companies and multi-tier local rental networks, with strict tenant isolation, country-determined branch currencies, and role-based access control.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, `next-intl` (Arabic RTL / English LTR) |
| **State Management** | Redux Toolkit (RTK Query), `react-redux` |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL (`pg` driver, parameterized SQL queries, versioned migrations) |
| **Security** | Argon2id password hashing, `HttpOnly` secure cookies, 256-bit SHA-256 tokens, sliding-window rate limiting, Helmet |
| **Architecture** | Supabase-Studio-style dual-sidebar dashboard (`Ctrl+K` command palette, contextual sub-sidebars) |

---

## 📁 Repository Structure

```text
Revix System/
├── backend/                  # Express + TypeScript API server
│   ├── src/
│   │   ├── config/           # Environment configuration
│   │   ├── db/               # PostgreSQL client, migrations, and store contracts
│   │   │   └── migrations/   # SQL migration files (001, 002, ...)
│   │   ├── modules/          # Business logic domains
│   │   │   ├── auth/         # Authentication & token management
│   │   │   └── workspace/    # Company, branches, and currency management
│   │   ├── security/         # Argon2id hashing, rate limiting, token security
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Server entrypoint
│   ├── tests/                # Automated backend test suites
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Next.js App Router application
│   ├── public/               # Static assets & brand graphics
│   ├── src/
│   │   ├── app/              # Bilingual App Router routes (/[locale]/...)
│   │   ├── components/       # Modular UI components & workspace panels
│   │   │   ├── auth/         # Authentication views
│   │   │   ├── home/         # Landing page sections
│   │   │   ├── shared/       # Shared workspace navigation & badges
│   │   │   ├── ui/           # Design system primitives (Button, FormField, etc.)
│   │   │   └── workspace/    # Studio panels (LocationsManager, CompanySettings, etc.)
│   │   ├── i18n/             # English / Arabic localization catalogs & routing
│   │   ├── lib/              # Catalogs, validators, and helpers
│   │   └── store/            # Redux Toolkit store, slices, and RTK Query APIs
│   ├── tests/                # Automated frontend unit tests
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                     # Architectural & operational documentation
│   ├── architecture.md
│   ├── auth-and-security.md
│   ├── local-setup.md
│   └── providers-and-migrations.md
│
├── revix-design-assets/      # Logos, brand typography, and image assets
├── docker-compose.yml        # Docker compose services
└── Revix_System_Business_Concept.md  # Detailed business blueprint
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v22+ (tested on Node.js v26)
- **PostgreSQL**: PostgreSQL 16+ (local service or container)
- **npm** or **pnpm**

---

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment configuration
cp .env.example .env

# Run database migrations
npm run migrate

# Start backend server in development mode
npm run dev
```
The API server will listen on `http://localhost:4000/api/v1`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start Next.js development server
npm run dev
```
The frontend application will be available at `http://localhost:3000`.

---

## 🔒 Security & Data Integrity

- **Zero Client-Side Secret Storage**: Sensitive session tokens and user state are never stored in `localStorage` or `sessionStorage`.
- **Database Persistence**: All user records, companies, branches, and audit logs are strictly persisted in PostgreSQL.
- **Cryptographic Security**: Passwords are hashed using OpenSSL-native **Argon2id** with salt generation and constant-time verification.
- **Strict Multi-Tenancy**: Data access is scoped strictly by tenant `company_id` and verified user permissions.

---

## 📄 License

Proprietary software. All rights reserved © Revix System.
