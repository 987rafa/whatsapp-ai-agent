<div align="center">

![whatsapp-ai-agent](assets/banner.svg)

**A self-hosted AI agent for your WhatsApp.** Bring your own LLM — Google Gemini (free tier), OpenAI, Groq, OpenRouter… or **Ollama for 100% local**. It replies, remembers, runs commands and understands images.

[![CI](https://github.com/987rafa/whatsapp-ai-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/987rafa/whatsapp-ai-agent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-25d366.svg)](LICENSE)
[![Node.js >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
[![README en Español](https://img.shields.io/badge/README-Espa%C3%B1ol-yellow.svg)](README.es.md)

</div>

---

## ✨ Why whatsapp-ai-agent?

- 🧠 **Real AI, $0 to start** — works out of the box with Google Gemini's free tier, or any OpenAI-compatible endpoint: Groq, OpenRouter, Together, LM Studio, or **Ollama to keep everything on your machine**.
- 🪶 **Zero bloat** — just 3 dependencies, pure Node.js ≥ 22, no build step, no database. ESM everywhere, native test runner, CI included.
- 🔒 **Self-hosted means private** — your session, your messages, your machine. There are no servers in the middle because there is no middle.
- 🖼️ **It understands images** — send a photo and ask anything: *describe it, translate it, read the text in it.*
- 🧩 **Plugin architecture** — add a command in ~10 lines; `!help` builds itself from your plugins.
- 🧵 **Conversation memory** — every chat keeps context, and `!olvidar` wipes it when you want a fresh start.
- ⚡ **Two ways to link** — scan a QR or use an **8-digit pairing code** (`PAIRING_PHONE`), no QR needed.
- 🐳 **Boring deployment** — Docker, docker-compose, Render, or plain `npm start`.

## 🚀 Quick start

You need a WhatsApp account (a spare number works best) and a free [Gemini API key](https://aistudio.google.com/apikey).

### Option A — Docker (recommended)

```bash
git clone https://github.com/987rafa/whatsapp-ai-agent.git
cd whatsapp-ai-agent
cp .env.example .env      # paste your free Gemini key here
docker compose up -d --build && docker compose logs -f
```

### Option B — Node.js

```bash
git clone https://github.com/987rafa/whatsapp-ai-agent.git
cd whatsapp-ai-agent
cp .env.example .env      # paste your free Gemini key here
npm install && npm start
```

Now scan the QR shown in your terminal: **WhatsApp → Settings → Linked devices → Link a device**. That's it — send `!ping` to your own number from another account… or just message the linked phone and chat with the agent. 🎉

> Prefer no QR? Set `PAIRING_PHONE=573001234567` (international format, no `+`) and the agent prints an 8-digit code instead.

## 💬 What it looks like

```text
You  ❯ !ping
Aria ❯ 🏓 pong

You  ❯ summarize this in 3 bullets: <long text pasted>
Aria ❯ 1) …  2) …  3) …

You  ❯ [photo of a restaurant menu] what's the healthiest option?
Aria ❯ The grilled fish with salad is your best bet — about 420 kcal…

You  ❯ !clima Medellín
Aria ❯ 🌦️ Medellín: ⛅️ +24°C (sensación +25°C) · 💧62% · 🌬️↘9km/h

You  ❯ !ia off        ← mute the AI in this chat
Aria ❯ 🔕 IA desactivada en este chat.
```

## 🧩 Built-in commands

| Command | What it does |
| --- | --- |
| `!ping` | Liveness check — `pong` |
| `!help` | Auto-generated command list |
| `!calc (2+3)*4^2` | Safe calculator (own parser, no `eval`) |
| `!clima Bogotá` | Current weather for any city |
| `!ia on` / `!ia off` | Enable or mute the AI per chat |
| `!olvidar` | Wipe the AI's memory for this chat |

In **groups** the AI only answers when it's mentioned (or when you reply to one of its messages) — groups stay quiet otherwise.

## ⚙️ Configuration

Everything lives in `.env` (see [`.env.example`](.env.example)):

| Variable | Default | Description |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | `gemini` or `openai` (any OpenAI-compatible API) |
| `GEMINI_API_KEY` | — | Free key at [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Any Gemini model (e.g. `gemini-3.8-flash`) |
| `OPENAI_API_KEY` | — | Key for OpenAI-compatible providers |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Point it anywhere (Groq, OpenRouter, Ollama…) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name for the compatible provider |
| `BOT_NAME` | `Aria` | The agent's name in its system prompt |
| `BOT_LANG` | `es` | `es` or `en` — language of built-in messages |
| `BOT_PREFIX` | `!` | Command prefix |
| `AI_PRIVATE_CHATS` | `true` | Reply to every DM |
| `AI_GROUP_MENTIONS` | `true` | In groups, reply only when mentioned |
| `AI_HISTORY_SIZE` | `12` | Messages of memory per chat |
| `AI_SYSTEM_PROMPT` | friendly assistant | The agent's personality |
| `PAIRING_PHONE` | — | Link with a code instead of QR |
| `DATA_DIR` | `./data` | Where session + store are kept |

### 100% local with Ollama

```env
AI_PROVIDER=openai
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama        # any non-empty string
OPENAI_MODEL=llama3.2        # or an llava model for image understanding
```

## 🏗️ How it works

```mermaid
flowchart LR
    WA[WhatsApp] -->|messages| B[Baileys socket]
    B --> R{Message router}
    R -->|"!command"| P[Plugins<br/>ping · calc · clima · ia]
    R -->|text or image| A[AI provider<br/>Gemini / OpenAI-compatible]
    A --> M[(Memory + settings<br/>JSON store)]
    P --> O[Reply]
    A --> O
    O --> WA
```

- `src/core/agent.js` — the router: command, AI, or silence.
- `src/core/store.js` — tiny JSON store: per-chat memory & settings.
- `src/ai/` — provider adapters (plain `fetch`, no SDKs).
- `src/plugins/` — one file per command, auto-discovered.

## 🔌 Write your own plugin

Drop a file in `src/plugins/` — that's the whole API:

```js
// src/plugins/echo.js
export default {
  name: 'echo',
  aliases: ['repetir'],
  description: 'Repeats what you say — e.g. !echo hola',
  run: async (ctx) => ctx.args.join(' ') || 'say something 🙂',
};
```

`ctx` gives you `sock`, `msg`, `args`, `config`, `getSetting` / `setSetting`, `clearMemory` and more. Restart, and `!help` already lists it.

## ☁️ Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/987rafa/whatsapp-ai-agent)

Works great on any small VPS, Docker host, or a Raspberry Pi left at home. The only state is `./data` — mount it and forget it.

## 🗺️ Roadmap

- [ ] Tool/function calling (let the AI use the built-in commands itself)
- [ ] Voice notes → transcription (Whisper) → reply
- [ ] RAG: answer questions from your own documents
- [ ] Multi-provider fallback + per-chat model selection
- [ ] Web dashboard (React) for memory & settings

## 🤝 Contributing

PRs are welcome! Fork → branch → `npm test` → PR. Ideas and bugs: [open an issue](https://github.com/987rafa/whatsapp-ai-agent/issues).

> ⚠️ **Disclaimer** — this is an unofficial, self-hosted project built on the WhatsApp Web multi-device protocol (via [Baileys](https://github.com/WhiskeySockets/Baileys)). Use it responsibly with your own number, and don't spam.

## 📄 License

MIT © [Rafael Álvarez](https://github.com/987rafa)

---

<div align="center">

**If this project saved you time, a ⭐ helps more people find it.**

</div>
