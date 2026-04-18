## Problem

AI assistants can write steering rules with incorrect YAML syntax. The SteeringRuleInjector uses a simple regex-based frontmatter parser that only understands bracket array syntax (`events: [X, Y]`), not YAML list syntax (`events:\n  - X\n  - Y`). When Claude writes a rule using the wrong format, the rule silently fails to load and inject.

## Solution

A PreToolUse hook that validates steering rule files before Write/Edit completes. It checks that the frontmatter uses the correct bracket array format and blocks with a helpful error message if not.

## How It Works

1. Hook fires on PreToolUse for Write and Edit operations
2. Checks if the file path matches `/steering-rules/*.md`
3. Extracts content from Write.content or Edit.new_string
4. Validates frontmatter format:
   - Must have `name: <value>` field
   - Must have `events: [Event1, Event2]` in bracket format
   - Must have `keywords: [word1, word2]` in bracket format
5. If validation fails, returns block decision with specific errors and example of correct format
6. If validation passes, allows the write to proceed

## Signals

**Input:**
- Tool name (Write or Edit)
- File path
- File content (Write) or new_string (Edit)

**Output:**
- Allow: empty output, write proceeds
- Block: `{ decision: "block", reason: "..." }` with validation errors and correct format example
