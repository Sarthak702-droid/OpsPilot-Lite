#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/migrate.sh
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U opspilot -d opspilot < scripts/seed.sql

