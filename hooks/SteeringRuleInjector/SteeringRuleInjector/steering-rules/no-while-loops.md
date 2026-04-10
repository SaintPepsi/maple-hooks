---
name: no-while-loops
events: [SessionStart]
keywords: []
---

Never write while loops. In virtually every case, a deterministic alternative exists: for loops with known bounds, for-of over collections, Array methods (.map, .filter, .reduce), or recursion with a depth limit. A while loop signals "I don't know when this ends" — figure out the bounds first, then use a bounded construct. If you genuinely cannot determine bounds (e.g., reading a stream until EOF), use a for loop with a hard upper limit and break on the termination condition.
Bad: `while (!(await page.getByText(/target/i).isVisible())) { await click(); }` — infinite loop risk if selector changes.
Bad: `while (items.length > 0) { process(items.pop()); }` — use for-of or .forEach instead.
Correct: `for (let step = 3; step <= 8; step++) { await click(); }` — deterministic, self-documenting.
Correct: `for (const item of items) { process(item); }` — bounded by the collection.
Correct: `for (let i = 0; i < MAX_RETRIES; i++) { if (done) break; }` — bounded with hard limit when true termination is uncertain.
