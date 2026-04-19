# 🤖 PAI Hooks

### Intelligent "Guardrails" for your AI Development Workflow.

**PAI Hooks** is a collection of automation scripts designed to sit between you and your AI (specifically for **Claude Code**). These aren't just scripts; they are the "connective tissue" that helps your AI remember what it learned, stay within budget, and follow your coding standards without being asked.

---

## 🚀 What can these hooks do?

These hooks are categorized into specialized "departments" that handle the heavy lifting of your AI sessions:

- **🧠 Memory & Learning:** Automatically extracts "learning signals" from your conversations so your AI actually gets smarter over time.
- **🛡️ Security & Safety:** Blocks the AI from accidentally deleting your core settings or bypassing your security rules.
- **⚖️ Quality Control:** Enforces strict TypeScript rules, checks documentation obligations, and ensures your code stays high-quality.
- **📈 Session Analytics:** Tracks exactly how much your prompts cost and how much "Prompt Caching" is saving you.
- **🔄 Workflow Sync:** Automatically keeps your PRDs, git branches, and project documentation in sync with the code.

---

## 💡 See an Idea? Copy it.

The most unique part of this repository is that it isn't just a codebase—it's an **Idea Factory**.

Inside the `hooks/` folders, you will find `IDEA.md` files. These are project-agnostic descriptions of a specific automation.

- **Found a cool concept?** Use the **"Copy Idea"** button (or copy the text) and feed it to your favorite LLM.
- **Make it yours:** The `IDEA.md` files are designed so you can recreate these hooks in _any_ stack, whether you use Bun, Python, or something else entirely.

**Don't just use our tools—steal our logic and build your own.**

---

## 🛠️ Quick Start

Ready to supercharge your setup? If you have **Bun** installed, it’s a one-liner:

```bash
git clone [https://github.com/SaintPepsi/pai-hooks.git](https://github.com/SaintPepsi/pai-hooks.git)
cd pai-hooks
bun install && bun run install-hooks
```

_This will safely merge the hooks into your `settings.json` and keep your existing setup intact._

---

## 🌟 Explore the Ecosystem

The best way to understand PAI Hooks is to dive into the folders. Look for the `doc.md` files for deep-dives into specific hooks, or check out the `IDEA.md` files to see the "why" behind the code.

**Happy Automating!**
