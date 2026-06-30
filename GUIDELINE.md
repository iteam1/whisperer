# Whisperer — Setup & Usage

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [VSCode](https://code.visualstudio.com)
- Claude Code CLI (already running in a VSCode integrated terminal)

## One-time install

```bash
# 1. Clone and install dependencies
git clone <repo-url> whisperer
cd whisperer
bun install

# 2. Build the VSCode extension
bun run --cwd packages/extension build

# 3. Symlink the extension into VSCode
#    Folder name MUST be publisher.name-version (from package.json)
ln -s "$(pwd)/packages/extension" ~/.vscode/extensions/locch.whisperer-0.0.1

# 4. Install the /whisper slash command for this project
mkdir -p .claude/commands
cp assets/whisper.md .claude/commands/whisper.md
```

> **Quit and reopen VSCode** after the symlink — a reload isn't enough for a new extension to register.

## Each session

```bash
# 1. Start the broker (keep this terminal open)
bun run --cwd packages/broker dev

# 2. Open the project folder in VSCode
#    Check Output ▸ Whisperer for "whisperer activated"

# 3. Click into a file to set the cursor

# 4. In a Claude Code terminal inside the repo:
/whisper          # medium — ghost text (one code block)
/whisper low      # low    — ghost text (a few lines)
/whisper high     # high   — diff view, accept with ✓ or Cmd+Enter
/whisper check    # verify the broker↔extension link
```

> ⚠️ **Restarted the broker?** Its registry is in memory — reload the VSCode window
> (`Reload Window`) so the extension re-registers.

## Cleanup

```bash
rm ~/.vscode/extensions/locch.whisperer-0.0.1
```
