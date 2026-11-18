# Local Setup

Use Node.js 26.x as specified in `.nvmrc`.

## 1. Backend (`backend/`)

```powershell
cd backend
npm.cmd install
# Copy .env.example to .env and set DATABASE_URL when PostgreSQL is running
npm.cmd run dev
```

The Express API listens on `http://localhost:4000` (`/api/v1/health`, `/api/v1/auth/*`).
To run PostgreSQL migrations when `DATABASE_URL` is configured:

```powershell
npm.cmd run migrate
```

Backend validation commands: `npm.cmd run typecheck`, `npm.cmd test`.

## 2. Frontend (`frontend/`)

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. English (`/en`) and Arabic (`/ar`) interfaces are available and connect to the Express backend via Redux Toolkit (`NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:4000/api/v1`).

Frontend validation commands: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`.
