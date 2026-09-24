# Security

The backend verifies Clerk RS256 session signatures from the configured JWKS URL and checks the issuer. Roles and organization membership come from PostgreSQL. Queries include the authenticated organization ID, and composite foreign keys enforce tenant references. Redis limits general, import, and AI request rates. The configured frontend origin is the only permitted CORS origin. All action transitions are tenant scoped and audited.

Business names, questions, and PDF text are untrusted input to MiMo. The model has no SQL tools or database credentials. Keep `HF_TOKEN`, Clerk secret, database URLs, R2 credentials, and internal MiMo API keys out of frontend builds and Git. PDF imports require an authenticated manager or higher, validate PDF content and reviewed fields, and store private objects in R2. Operators should set bucket access policy and retention before using sensitive documents.
