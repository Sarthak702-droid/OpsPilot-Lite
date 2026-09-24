#!/usr/bin/env bash
set -euo pipefail
if [[ "${RESET_DB:-}" != "1" ]]; then echo 'Set RESET_DB=1 to recreate the development database.' >&2; exit 1; fi
cd "$(dirname "$0")/.."
docker compose down -v
docker compose up -d postgres redis
./scripts/migrate.sh

