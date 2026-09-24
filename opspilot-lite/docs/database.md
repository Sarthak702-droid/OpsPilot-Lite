# Database

Versioned SQL is in `backend/migrations`. `go run ./cmd/migrate` applies each upward migration in its own transaction and records it in `schema_migrations`. Business tables have `organization_id`; cross-table references use `(organization_id,id)` where applicable to block cross-tenant references at the database boundary. `invoices.outstanding_amount` is generated from total and paid amount. Monetary columns use PostgreSQL `numeric(18,2)`; the current API converts them to JSON numbers for display.

The importer validates CSV/XLSX rows before a single database transaction. Product SKU, invoice number, purchase order number, and nonempty payment reference are unique per organization. Imported sales and stock movements use deterministic IDs from source_id, so repeat imports are safe. The seed script creates exact demo counts and known risk scenarios.

