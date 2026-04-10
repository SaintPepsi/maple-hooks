---
name: browser-mandatory-for-all-css-changes
events: [PreToolUse]
keywords: [.css, .scss, .less, style]
---

Every CSS change requires before/after screenshots via Browser skill. No exceptions.
Bad: Edit CSS, push, user reports broken. Correct: Screenshot, edit, screenshot, compare, only push after visual confirmation.
