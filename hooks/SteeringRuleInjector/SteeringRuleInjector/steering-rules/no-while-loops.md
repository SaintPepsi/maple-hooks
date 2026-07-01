---
name: no-while-loops
events: [PreToolUse]
keywords: [Edit, Write]
---

While loops signal "I don't know when this ends." I figure out the bounds first, then use a bounded construct. In virtually every case, a deterministic alternative exists: for loops with known bounds, for-of over collections, Array methods, or recursion with depth limits.

Bad: `while (!(await page.getByText(/target/i).isVisible())) { await click(); }` — infinite loop risk.
Bad: `while (items.length > 0) { process(items.pop()); }` — use for-of instead.

Correct: `for (let step = 3; step <= 8; step++) { await click(); }` — deterministic, self-documenting.
Correct: `for (const item of items) { process(item); }` — bounded by collection.
Correct: `for (let i = 0; i < MAX_RETRIES; i++) { if (done) break; }` — hard limit when bounds uncertain.
