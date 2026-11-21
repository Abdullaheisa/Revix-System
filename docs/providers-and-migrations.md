# Service Integrations & Migrations

- **Database:** PostgreSQL (`pg` driver) with explicit SQL migrations in `backend/src/db/migrations/`.
- **Authentication:** Backend-owned session authentication in `backend/src/modules/auth/`.
- **Email & Private Storage Providers:** Email is abstracted behind `EmailDeliveryAdapter` in `backend/src/modules/auth/emailDelivery.ts`. Production SMTP/API email and S3-compatible private file storage providers can be configured before deployment.
