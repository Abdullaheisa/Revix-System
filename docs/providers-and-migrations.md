# Service Integrations & Migrations

- **Database:** PostgreSQL (`pg` driver) with explicit SQL migrations in `backend/src/db/migrations/`.
- **Authentication:** Self-hosted backend-owned session authentication in `backend/src/modules/auth/` (no Firebase or Supabase).
- **Email & Private Storage Providers:** Abstracted behind adapter interfaces (`EmailDeliveryAdapter` in `backend/src/modules/auth/emailDelivery.ts`). Production SMTP/API email and S3-compatible private file storage providers will be configured before production deployment.
