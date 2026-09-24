#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
docker compose up -d postgres redis
./scripts/migrate.sh
export GOCACHE="${GOCACHE:-/tmp/opspilot-go-build}"
export GOMODCACHE="${GOMODCACHE:-/tmp/opspilot-go-mod}"
(cd backend && go run ./cmd/api) & api_pid=$!
(cd backend && go run ./cmd/worker) & worker_pid=$!
(cd frontend && env -u PORT npm run dev -- --port 3000) & web_pid=$!
trap 'kill "$api_pid" "$worker_pid" "$web_pid" 2>/dev/null || true' EXIT INT TERM
wait -n "$api_pid" "$worker_pid" "$web_pid"
