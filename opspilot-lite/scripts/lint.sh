#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export GOCACHE="${GOCACHE:-/tmp/opspilot-go-build}"
export GOMODCACHE="${GOMODCACHE:-/tmp/opspilot-go-mod}"
(cd "$root/backend" && test -z "$(gofmt -l .)" && go vet ./...)
(cd "$root/frontend" && npm run lint)

