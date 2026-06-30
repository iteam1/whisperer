# whisperer

Use the Claude Code CLI you're already running as a Copilot-style completion engine in VSCode. You drive, Claude fills in. No autonomous agent burning $6k while you sleep.

> Status: working — broker + extension + `/whisper`, all three effort levels end-to-end.

## Effort levels

| Effort | Scope | Surface |
|--------|-------|---------|
| `low` | a few lines | ghost text |
| `medium` | a whole block | ghost text |
| `high` | the whole file | diff → accept with ✓ / `Cmd+Enter` |

```
/whisper          # medium (default)
/whisper low
/whisper high
/whisper check    # is the broker talking to VSCode?
```

## How it works

```
/whisper  →  broker :2323  →  extension  →  ghost text / diff
```

- **broker** — tiny Bun HTTP server. Routes completions by workspace path, no focus-tracking nonsense.
- **extension** — registers with broker on startup, streams cursor position, renders the completion.
- **/whisper** — reads cursor context, infers a completion sized to effort, posts it back.

See [`docs/design.md`](./docs/design.md) for the full data flow.

## Each session

```bash
# 1. start the broker
bun run --cwd packages/broker dev

# 2. install the slash command into your current project
mkdir -p .claude/commands && cp assets/whisper.md .claude/commands/whisper.md
```

Then open the project in VSCode, click into a file, and `/whisper`.

> Restarted the broker? It forgets everything — reload the VSCode window so the extension re-registers.

## Alternative backends

Whisperer doesn't care what model runs the completion. Swap the backend, `/whisper` keeps working.

### GLM / Z.ai (cloud, flat-rate)

[Z.ai's GLM Coding Plan](https://z.ai/subscribe) (~$10–80/month) has a native
Anthropic-compatible endpoint — no proxy needed:

```bash
export ANTHROPIC_BASE_URL="https://api.z.ai/api/coding/paas/v4"
export ANTHROPIC_AUTH_TOKEN="your-zai-api-key"
claude --model glm-4.7
```

### Ollama (local)

Ollama speaks OpenAI format, so you need LiteLLM as a shim:

```bash
litellm --model ollama/qwen2.5-coder:7b --port 4000

export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="sk-local"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
```

To persist either config: `claude config set -g env.ANTHROPIC_BASE_URL "<url>"` and `claude config set -g env.ANTHROPIC_AUTH_TOKEN "<key>"`.

See [`docs/local-backends.md`](./docs/local-backends.md) for more options.

## First time?

See [`GUIDELINE.md`](./GUIDELINE.md) for the one-time extension build + symlink install.

## Related reading

**Code suggestions**

- [Getting code suggestions in your IDE with GitHub Copilot](https://docs.github.com/en/copilot/how-tos/get-code-suggestions/get-ide-code-suggestions)

**VSCode Extension**

- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)

**MCP / Language Server Protocol**

- [Model Context Protocol - Introduction](https://modelcontextprotocol.io/docs/getting-started/intro)
- [VSCode Extension with an MCP server that exposes semantic tools like Find Usages and Rename to LLMs](https://github.com/biegehydra/BifrostMCP)
- [The 2-Minute Claude Code Upgrade You're Probably Missing: LSP](https://karanbansal.in/blog/claude-code-lsp/)
- [Discover and install prebuilt plugins through marketplaces](https://code.claude.com/docs/en/discover-plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Microsoft - Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [LSP From Scratch](https://www.youtube.com/watch?v=p0Vlz66AFNw&list=PLq5tGLDKHlW-owkJWZrueldeR6mbqBvOg)
- [Minimum Viable VS Code Language Server Extension](https://github.com/semanticart/minimum-viable-vscode-language-server-extension)
- [BifrostMCP](https://github.com/biegehydra/BifrostMCP)