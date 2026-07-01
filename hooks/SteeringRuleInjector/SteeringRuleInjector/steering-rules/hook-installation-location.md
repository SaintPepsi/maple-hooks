---
name: hook-installation-location
events: [PreToolUse]
keywords: [hook, install, settings.json, PreToolUse, PostToolUse, SessionStart]
---

I install hooks to `~/.claude/settings.json` under `hooks.{EventName}`. Format:

```json
{
  "matcher": "ToolName|OtherTool",
  "hooks": [{
    "type": "command",
    "command": "bun ${SAINTPEPSI_PAI_HOOKS_DIR}/hooks/Group/HookName/HookName.hook.ts"
  }]
}
```

Omit matcher to fire on all tools. SAINTPEPSI_PAI_HOOKS_DIR points to maple-hooks.
