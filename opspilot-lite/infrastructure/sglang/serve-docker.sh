#!/usr/bin/env bash
set -euo pipefail
: "${HF_TOKEN:?Set HF_TOKEN on the inference host}"
docker run --gpus all --shm-size 32g -p 127.0.0.1:30000:30000 \
  -v "${HOME}/.cache/huggingface:/root/.cache/huggingface" \
  --env HF_TOKEN --ipc=host lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
    --model-path "XiaomiMiMo/MiMo-V2.6-Pro-RL" \
    --host 0.0.0.0 --port 30000

