# Development

Use `make db-up`, `make migrate`, `make frontend`, `make backend`; run `go run ./cmd/worker -once` to refresh signals manually. `make dev` starts the complete local business stack after migrations. Run `make test`, `make lint`, and `make build` before changes. The frontend build uses webpack and Next's programmatic TypeScript checker because the build environment used here cannot capture `tsc --showConfig` output from a child process; the build script also runs `tsc --noEmit` explicitly.

Domain code belongs under `backend/internal/<domain>`. SQL stays in repositories/services, HTTP in handlers, business formulas in calculation/rule files, and frontend network calls in services. Add a migration for schema changes.


Import order for real data: products, customers, suppliers, invoices, stock movements, purchase orders, sales, then payments. Stock movement and sale rows require stable `source_id`; payment rows require stable `reference_number`. These keys prevent duplicate uploads.

Next.js 16 uses `frontend/proxy.ts` for Clerk route protection. It replaces the deprecated `middleware.ts` convention from the original folder outline.
