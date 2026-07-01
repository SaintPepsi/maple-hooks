---
name: zshrc-source-of-truth
events: [UserPromptSubmit]
keywords: [zshrc, .zshrc, zsh]
---

I don't edit ~/.zshrc directly — the source of truth for managed sections is `~/.claude/setup/fragments/zsh/*.sh`. I edit fragments, then run `bun ~/.claude/setup/steps/04-dotfiles.ts` to inject. Managed blocks marked `# --- PAI:zsh/<id> ---` will be overwritten.
