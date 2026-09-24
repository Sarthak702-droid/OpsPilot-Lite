# OpsPilot Lite

Operational intelligence for small and medium businesses. PostgreSQL holds facts; Go calculates inventory, receivable, and supplier risks; a scheduled worker persists signals; MiMo is called only for bounded explanations. Consequential purchase order drafts require approval and a separate execute step.

## Current implementation

- Next.js 16 dashboard, inventory, customers, invoices, suppliers, signals, Ask OpsPilot, action center, CSV/XLSX import, and onboarding.
- Go/Gin API with Clerk JWT verification, tenant scoped reads and foreign keys, role checks, Redis rate limits, dashboard cache, and optional OTLP request tracing.
- PostgreSQL migrations, deterministic signal worker, CSV/XLSX imports for products, customers, suppliers, invoices, stock movements, purchase orders, sales, and payments, purchase order draft actions, audit events.
- SGLang chat completions client with retries, timeouts, evidence validation, audited recommendation persistence, SSE proxy, and deterministic fallback.

## Setup

Requires Go 1.25, Node 24, Docker Compose, and a Clerk application.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
# Fill Clerk publishable key, Clerk issuer, and JWKS URL.
make db-up
make migrate
cd frontend && npm ci && cd ..
make dev
```

The frontend runs at `http://localhost:3000`, API at `http://localhost:8080`, PostgreSQL on 15432, and Redis on 16379. Set `FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_URL` for other origins. The Go API reads environment variables; `scripts/dev.sh` loads root `.env`.

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

CSV and XLSX imports are available. PDF import extracts text with `pdftotext`, optionally asks MiMo for field suggestions, then requires a user to review the fields before committing an invoice, draft purchase order, or quotation record. Committed PDFs are stored in private Cloudflare R2; configure the R2 variables to enable the final commit. Scanned image-only PDFs need OCR and are not supported yet.

Manual payment management UI, full purchase order management, and comprehensive authorization/integration coverage are not implemented yet. OTLP tracing covers API requests and non-streaming MiMo completions; it does not yet expose database, Redis, worker, or metrics instrumentation. The action executor creates an internal draft PO only; it sends no supplier commitment. Do not deploy this repository as a complete financial operations platform without completing and reviewing those areas.
