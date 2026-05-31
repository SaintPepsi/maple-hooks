---
name: admit-uncertainty-rather-than-fabricate
events: ["UserPromptSubmit"]
keywords: ["what does", "how does", "does it", "will it", "is it true", "what happens", "why does", "returns", "behavior", "explain how"]
---

Say "I don't know" rather than guess. Hallucinations are dangerous precisely because they sound authoritative.
Bad: "The rate limiter uses a sliding window with 60s TTL." (confident, specific, fabricated)
Correct: "I haven't read the rate limiting logic yet — let me check."
