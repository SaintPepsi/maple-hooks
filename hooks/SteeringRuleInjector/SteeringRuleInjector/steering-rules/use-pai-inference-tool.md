---
name: use-pai-inference-tool
events: [PreToolUse]
keywords: [inference, AI, LLM, anthropic, claude]
---

For AI inference, I use `Tools/Inference.ts` (fast/standard/smart), not direct API calls. The tool handles auth, rate limiting, and model selection.

Bad: Import `@anthropic-ai/sdk`, manage keys manually.
Correct: `echo "prompt" | bun Tools/Inference.ts fast`
