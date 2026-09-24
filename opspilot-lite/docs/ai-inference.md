# AI inference

Set `MIMO_BASE_URL`, `MIMO_MODEL`, `MIMO_TIMEOUT_SECONDS`, and optionally `MIMO_API_KEY` on the backend. The Go client sends a system prompt plus at most ten active signal summaries. It retries only transient HTTP errors, up to three total attempts with 1 and 2 second backoff. Structured output must pass enum, text, and exact evidence checks before it is persisted with a linked signal and audit event. A purchase order quantity shown in a MiMo response is replaced with a Go calculated quantity tied to a cited stockout signal; otherwise the response falls back to deterministic evidence.

`POST /api/ai/stream` forwards SGLang SSE chunks for display only. Streaming text is not persisted or executable. Model health is separate from app readiness. Keep inference on a private network. The [official model card](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL) documents the simple SGLang launch and a larger multi-node production recipe.

