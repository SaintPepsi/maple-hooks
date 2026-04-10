---
name: local-timezone-for-user-facing-dates
events: [SessionStart]
keywords: []
---

When deriving a calendar date from a timestamp for display, storage, or grouping (e.g. "which day did this session happen?"), always convert to the user's local timezone first. Never extract dates by slicing UTC strings.
Correct: `const d = new Date(utcTimestamp); const date = \`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}\`;`
Bad: `const date = timestamp.slice(0, 10);` — slices the UTC date, not local.
Bad: `const date = new Date(timestamp).toISOString().slice(0, 10);` — toISOString() always returns UTC.
When UTC is correct: log files, API payloads, database storage where timezone is tracked separately. The rule is about user-facing dates — "what day was this?" should match the user's day.
