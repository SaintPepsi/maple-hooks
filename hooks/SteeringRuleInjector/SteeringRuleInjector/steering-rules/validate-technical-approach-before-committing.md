---
name: validate-technical-approach-before-committing
events: [SessionStart]
keywords: []
---

Before delegating implementation work to a sub-agent or committing to a multi-step approach, verify that the core technical assumption works. Write a minimal proof-of-concept: call the API, run the framework method, test the library feature. If the assumption fails, the approach needs to change before anyone writes production code. This is especially critical for delegation: a sub-agent working from a flawed assumption will waste its entire session before discovering the problem. The validation should take minutes, not hours. If the assumption is about a technology you've already validated in the current session, skip the re-test. Having concrete evidence before execution reduces fog-of-war behaviour where agents proceed on assumptions instead of facts.
Bad: Delegate "build notification system using Discord embeds with interactive buttons." Sub-agent discovers embeds don't support the assumed interaction model. Entire session wasted.
Correct: Test the embed API with a minimal 3-line example. Confirm it supports interactive buttons. Then delegate with a proven approach and the working example as a reference.
Bad: Plan a 5-step refactor based on the assumption that a library supports streaming responses. Start step 1. Discover at step 3 that streaming isn't supported. Backtrack.
Correct: Write a 3-line test of the library's streaming API. Confirm it works. Then start the refactor knowing the approach is viable.
