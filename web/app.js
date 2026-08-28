const micBtn = document.getElementById('mic-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

let ws;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

function connect() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  const url = `${proto}//${host}`;
  statusEl.textContent = 'Connecting to ' + url;
  ws = new WebSocket(url);

  ws.onopen = () => {
    statusEl.textContent = 'Connected. Tap button to speak.';
    micBtn.disabled = false;
  };

  ws.onclose = (e) => {
    statusEl.textContent = 'Disconnected (' + e.code + '). Reconnecting...';
    micBtn.disabled = true;
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    statusEl.textContent = 'WS error connecting to ' + url;
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'result') {
      resultEl.textContent = data.text;
      statusEl.textContent = 'Copied to clipboard!';
    } else if (data.type === 'error') {
      resultEl.textContent = 'Error: ' + data.message;
    }
  };
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(reader.result)));
          ws.send(JSON.stringify({ type: 'audio', chunk: base64 }));
        };
        reader.readAsArrayBuffer(e.data);
      }
    };

    mediaRecorder.start(100);
    micBtn.classList.add('recording');
    micBtn.textContent = 'Tap to Stop';
    statusEl.textContent = 'Listening...';
    resultEl.textContent = '';
  } catch (err) {
    statusEl.textContent = 'Mic access denied.';
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    micBtn.classList.remove('recording');
    micBtn.textContent = 'Tap to Speak';
    statusEl.textContent = 'Processing...';

    setTimeout(() => {
      ws.send(JSON.stringify({ type: 'end' }));
    }, 200);
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
  isRecording = !isRecording;
}

micBtn.addEventListener('click', toggleRecording);

connect();

