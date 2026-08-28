const WebSocket = require('ws');
const OpenAI = require('openai');
const clipboardy = require('clipboardy');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  let audioChunks = [];

  ws.on('message', async (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'audio') {
      audioChunks.push(Buffer.from(data.chunk, 'base64'));
    } else if (data.type === 'end') {
      try {
        const buffer = Buffer.concat(audioChunks);
        audioChunks = [];

        const transcription = await openai.audio.transcriptions.create({
          file: new File([buffer], 'audio.webm', { type: 'audio/webm' }),
          model: 'whisper-1',
        });

        const enhanced = await enhancePrompt(transcription.text);

        clipboardy.writeSync(enhanced);

        ws.send(JSON.stringify({ type: 'result', text: enhanced }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }
  });
});

async function enhancePrompt(text) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.MODEL || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: process.env.MASTER_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

console.log(`MetaClipboard server running on ws://localhost:${PORT}`);

</content>