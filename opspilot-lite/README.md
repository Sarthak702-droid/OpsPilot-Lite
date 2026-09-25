# OpsPilot Lite

Operational intelligence for small and medium businesses. PostgreSQL holds facts; Go calculates inventory, receivable, and supplier risks; a scheduled worker persists signals; MiMo is called only for bounded explanations. Consequential purchase order drafts require approval and a separate execute step.

## Current implementation

- Next.js 16 dashboard, inventory, customers, sales, invoices, payments, suppliers, purchase orders, signals, Ask OpsPilot, action center, imports, onboarding, and workspace settings.
- Go/Gin API with Clerk JWT verification, tenant scoped reads and foreign keys, role checks, Redis rate limits, dashboard cache, optional OTLP tracing, and Prometheus format HTTP metrics at `/metrics`.
- PostgreSQL migrations, coordinated deterministic signal worker, CSV/XLSX imports, sales with atomic stock movements, payment recording and reversal, purchase order approval, supplier send, receipt tracking, and audit events.
- SGLang chat completions client with retries, timeouts, evidence validation, audited recommendation persistence, SSE proxy, and deterministic fallback.

## Setup

Requires Go 1.25, Node 24, Docker Compose, and a Clerk application.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
# Run `clerk init --app app_3JpHDzdwZdsxSQA1kfaIWgy3wbG` from frontend/ to link Clerk and pull its development keys.
make db-up
make migrate
cd frontend && npm ci && cd ..
make dev
```

The frontend runs at `http://localhost:3000`, the local API at `http://localhost:18080`, PostgreSQL on 15432, and Redis on 16379. The frontend uses port 3000 even though the Go API reads `PORT` from root `.env`. If port 18080 is already in use, change `PORT` and `NEXT_PUBLIC_API_URL` in root `.env` and `NEXT_PUBLIC_API_URL` in `frontend/.env.local` together. `scripts/dev.sh` loads root `.env` and `frontend/.env.local`; the Go API derives its Clerk issuer and JWKS URL from the publishable key when explicit values are absent. For separate backend and worker terminals, load both files before starting those processes.

To create the deterministic demo organization and refresh signals:

```bash
make seed
cd backend && go run ./cmd/worker -once
```

The demo data is for database and engine verification. Its placeholder Clerk user cannot sign in; a real Clerk user must onboard their own organization. CSV fixtures can be imported into that organization from the UI.

## Tests

```bash
make test
make lint
make build
TEST_DATABASE_URL='postgres://opspilot:opspilot@localhost:15432/opspilot?sslmode=disable' \
  bash -c 'cd backend && go test ./tests/integration -v'
```

The Go inference test uses a local mock HTTP server. No live MiMo or GPU is needed in CI.

## Inference

SGLang is independently deployed. Set `MIMO_BASE_URL` on the Go backend; the browser never calls SGLang. See [AI inference](docs/ai-inference.md) and [SGLang scripts](infrastructure/sglang/README.md). The model card's full serving recipe requires substantial GPU infrastructure.

## Known gaps before production

CSV and XLSX imports are available. PDF import extracts text with `pdftotext` and uses local Tesseract OCR for scanned pages. MiMo may suggest fields, but a user must review them before committing an invoice, draft purchase order, or quotation. Committed PDFs are stored in private Cloudflare R2; configure the R2 variables to enable final commit. OCR processes the first five pages at 150 DPI and needs the backend image or local `pdftoppm` and `tesseract` binaries.

Sales, payment, and purchase order changes are available to OWNER, ADMIN, and MANAGER. A purchase order send requires approval by a different authorized member and an explicit execution step in Action center. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and optionally SMTP credentials to send through a STARTTLS server. If delivery outcome is uncertain, an owner or admin must confirm whether it was sent before another attempt. Unsent drafts can be cancelled; sent orders need a supplier-coordinated cancellation outside this workflow. Imported sales remain revenue-only records, and imported purchase orders without line items must be edited before sending.

Database integration tests require `TEST_DATABASE_URL` and `TEST_REDIS_URL`; the normal `go test ./...` run skips them without these variables. Validate the configured Clerk, R2, and SMTP services in a deployment environment before handling live financial data.
