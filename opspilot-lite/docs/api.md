# API

All `/api/*` routes require a Clerk bearer token. Onboarding routes are `GET /api/organization/me` and `POST /api/organization` (name, industry, currency, timezone). Membership is resolved from the verified Clerk subject and database, never a browser supplied organization ID.

Read routes: `/api/dashboard`, `/api/products`, `/api/inventory`, `/api/customers`, `/api/invoices`, `/api/suppliers`, `/api/signals`, `/api/actions`, `/api/recommendations`, `/api/ai/health`.

Mutations: `POST /api/import` multipart CSV/XLSX (`type`, `file`, optional JSON `mapping`); `POST /api/import/preview` returns headers and sample rows; `POST /api/import/pdf/preview` accepts a PDF and returns extracted text and optional MiMo field suggestions; `POST /api/import/pdf/commit` accepts the PDF plus JSON `review`, then stores it in R2 and writes the reviewed record and audit event. PDF commits require configured R2. Other mutations: `POST /api/ai/ask` (`question`), `POST /api/ai/stream` (SSE), `POST /api/actions/:id/approve`, `/reject`, `/execute`. Imports and action decisions require OWNER, ADMIN, or MANAGER. Errors use `{ "error": { "code", "message", "request_id" } }`. `/health` is process liveness; `/ready` requires PostgreSQL and Redis but not MiMo.
