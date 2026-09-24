#!/usr/bin/env bash
set -euo pipefail
base_url="${MIMO_BASE_URL:-http://localhost:30000}"
curl --fail-with-body --silent --show-error \
  "${base_url%/}/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  --data '{"model":"XiaomiMiMo/MiMo-V2.6-Pro-RL","messages":[{"role":"user","content":"What is the capital of France?"}]}'

