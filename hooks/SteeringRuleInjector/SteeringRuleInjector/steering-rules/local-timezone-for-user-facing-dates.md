---
name: local-timezone-for-user-facing-dates
events: [PreToolUse]
keywords: [date, timestamp, timezone, .ts, Edit, Write]
---

For user-facing dates ("what day was this?"), I convert to local timezone first. I never extract dates by slicing UTC strings. UTC is correct for logs/APIs/databases — but "what day" should match the user's day.

Bad: `timestamp.slice(0, 10)` — slices UTC, not local.
Bad: `new Date(ts).toISOString().slice(0, 10)` — toISOString() returns UTC.
Correct: `new Date(ts)` then extract local year/month/date components.
