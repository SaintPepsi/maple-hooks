---
name: use-pai-inference-tool
events: [SessionStart]
keywords: []
---

**Statement:** For AI inference, use `Tools/Inference.ts` (fast/standard/smart), not direct API.
**Bad:** Import `@anthropic-ai/sdk`, manage keys.
**Correct:** `echo "prompt" | bun Tools/Inference.ts fast`
