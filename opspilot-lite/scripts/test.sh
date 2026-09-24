#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export GOCACHE="${GOCACHE:-/tmp/opspilot-go-build}"
export GOMODCACHE="${GOMODCACHE:-/tmp/opspilot-go-mod}"
(cd "$root/backend" && go test ./...)
(cd "$root/frontend" && npm run typecheck && npm run test)

