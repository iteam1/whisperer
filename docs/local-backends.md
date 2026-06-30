# Claude Code with alternative backends

Claude Code talks to Anthropic's API by default, but two env vars redirect it anywhere
that speaks the Anthropic Messages API:

```bash
export ANTHROPIC_BASE_URL="<endpoint>"
export ANTHROPIC_AUTH_TOKEN="<key>"
unset  ANTHROPIC_API_KEY          # must be absent or Claude Code tries Anthropic directly
```

## Z.ai / GLM (recommended — no proxy needed)

Zhipu AI runs Z.ai, and they ship a **"GLM Coding Plan"** subscription designed
specifically for Claude Code. Their endpoint is natively Anthropic-compatible — no
LiteLLM, no Ollama, just point and shoot.

```bash
export ANTHROPIC_BASE_URL="https://api.z.ai/api/coding/paas/v4"
export ANTHROPIC_AUTH_TOKEN="your-zai-api-key"
claude --model glm-4.7
```

Or persist in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/coding/paas/v4",
    "ANTHROPIC_AUTH_TOKEN": "your-zai-api-key",
    "ANTHROPIC_MODEL": "glm-4.7",
    "API_TIMEOUT_MS": "3000000"
  }
}
```

Available models (as of mid-2026): `glm-5`, `glm-5.2`, `glm-4.7`, `glm-4.5-air`,
`glm-4.5-flash` (free tier). Flat-rate plans ~$10–80/month depending on prompt quota.

> The previous doc said GLM needs Ollama — that was wrong. GLM via Z.ai is a direct
> Anthropic-compatible cloud API, not a local model.

## Ollama (local, any model)

Ollama speaks OpenAI format, not Anthropic — you need LiteLLM as a translation layer:

```bash
# 1. start LiteLLM pointing at your local model
litellm --model ollama/qwen2.5-coder:7b --port 4000

# 2. point Claude Code at it
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="sk-local"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
```

## LM Studio (local, Anthropic-native)

LM Studio has its own Anthropic-compatible endpoint — no gateway needed:

```bash
export ANTHROPIC_BASE_URL="http://localhost:1234"
export ANTHROPIC_AUTH_TOKEN="lmstudio"
claude --model <model-name-from-lmstudio>
```

## Caveats

- **Tool use** degrades with weaker models. For `/whisper` (single-shot, no tool
  chaining) this barely matters — the model just needs to read context and output text.
- **Version pinning**: Claude Code updates occasionally break gateway compatibility.
  Set `"autoUpdate": false` in `~/.claude/settings.json` to lock the version.
- **vLLM**: Claude Code ≥ 2.1.154 broke with vLLM Anthropic-compatible endpoints —
  downgrade or pin if using vLLM.

## Why this matters for whisperer

The broker and extension are model-agnostic — they forward text, they don't care
where it came from. Switch the backend, `/whisper` keeps working unchanged. A GLM
flat-rate plan or a local 7B coder model is more than enough for `low`/`medium`
completions.
