#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
if [[ -f ../.env ]]; then set -a; source ../.env; set +a; fi
export GOCACHE="${GOCACHE:-/tmp/opspilot-go-build}"
export GOMODCACHE="${GOMODCACHE:-/tmp/opspilot-go-mod}"
go run ./cmd/migrate

