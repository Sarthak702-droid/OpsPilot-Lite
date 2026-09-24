# Architecture

Browser → Next.js → authenticated Go/Gin API → PostgreSQL/Redis. The worker reads tenant data, calculates metrics, and persists business signals every 15 minutes. Dashboard reads stored data without a model call. Ask OpsPilot answers simple list questions from signals and sends only a compact summary for reasoning questions. The Go client calls private SGLang at `/v1/chat/completions`; validated output is persisted and shown as a recommendation. A separate rule path creates internal purchase order suggestions with Go calculated quantities. A validated MiMo reorder recommendation can be linked to the existing approval action for that product; it never replaces the Go quantity. See [ADR 004](adr/004-deterministic-first.md).

SGLang is never in normal local Docker Compose. MiMo failure does not affect `/health`, `/ready`, dashboard, imports, or signals.
