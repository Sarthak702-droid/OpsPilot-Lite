# Deployment

Deploy Next.js and Go independently. Provide managed PostgreSQL and Redis, run migrations before starting API/worker, and deploy one worker instance to avoid duplicate scheduled refreshes. Set `APP_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `CLERK_JWKS_URL`, `CLERK_ISSUER`, `FRONTEND_ORIGIN`, and MiMo variables. The frontend needs `NEXT_PUBLIC_API_URL` and the Clerk publishable key.

SGLang belongs on a separate private GPU host. Do not publish port 30000. Use HTTPS for public frontend/API. Back up PostgreSQL before migration. Configure a private R2 bucket, the `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, and `R2_BUCKET` backend secrets, and allow the API to reach its S3-compatible endpoint. The backend image includes Poppler `pdftotext` for PDF imports. Set `OTEL_EXPORTER_OTLP_ENDPOINT` to an OTLP/HTTP collector URL to export API and MiMo spans; tracing is disabled when unset. The provided collector config logs received spans for development.
