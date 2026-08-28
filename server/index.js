const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = require('ws');
require('dotenv').config();

function writeToClipboard(text) {
  const tmp = path.join(require('os').tmpdir(), 'mc_clip.txt');
  fs.writeFileSync(tmp, text, 'utf8');
  execSync(`powershell -Command "Get-Content '${tmp}' -Raw | Set-Clipboard"`, { stdio: 'ignore' });
  fs.unlinkSync(tmp);
}

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '..', 'web', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

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

        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
        const payload = Buffer.concat([
          Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3-turbo\r\n--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n'),
          buffer,
          Buffer.from('\r\n--' + boundary + '--\r\n'),
        ]);

        const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
          },
          body: payload,
        });

        const sttData = await sttResponse.json();
        const enhanced = await enhancePrompt(sttData.text);

        writeToClipboard(enhanced);

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
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.MODEL || 'openrouter/free',
      messages: [
        { role: 'system', content: process.env.MASTER_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

server.listen(PORT, () => {
  console.log('MetaClipboard server running on http://localhost:' + PORT);
});