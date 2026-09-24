#!/usr/bin/env bash
set -euo pipefail
python3 -m sglang.launch_server \
  --model-path "XiaomiMiMo/MiMo-V2.6-Pro-RL" \
  --host 0.0.0.0 \
  --port 30000

