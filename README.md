# MetaClipboard

Phone-as-mic voice-to-clipboard bridge. Speak on your phone, AI enhances your words into polished prompts, auto-copied to PC clipboard via WebSocket. No mic needed.

## Workflow

1. Open web app on phone browser (same WiFi as PC)
2. Tap mic button → speak → audio streams to PC via WebSocket
3. PC transcribes via OpenAI Whisper API
4. PC enhances via OpenRouter using master prompt from config
5. Enhanced prompt appears on phone screen briefly
6. Auto-copied to PC clipboard instantly
7. Paste anywhere on PC

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

## Config

Edit `.env` for:
- `OPENAI_API_KEY` - For Whisper STT
- `OPENROUTER_API_KEY` - For prompt enhancement
- `MASTER_PROMPT` - System prompt for enhancement AI
- `MODEL` - OpenRouter model ID

</content>