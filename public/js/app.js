// Main Application Controller: State Machine, UI Interactions, and Network Calls

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Subsystems
  const avatar = new ShanksAvatar('avatarContainer');
  const haki = new HakiVFX(document.getElementById('hakiCanvas'));
  const audioPipeline = new AudioPipeline(avatar, haki);

  // UI Element References
  const pttButton = document.getElementById('pttButton');
  const pttStatusPill = document.getElementById('pttStatusPill');
  const hakiButton = document.getElementById('hakiButton');
  const textInput = document.getElementById('textChatInput');
  const sendButton = document.getElementById('sendChatBtn');
  const messagesContainer = document.getElementById('messagesContainer');
  const clearLogBtn = document.getElementById('clearLogBtn');
  const speechBubble = document.getElementById('speechBubbleOverlay');
  const bubbleText = document.getElementById('bubbleDialogueText');
  const alertBanner = document.getElementById('alertBanner');

  // Conversation History
  const conversationHistory = [];
  let isSpacePressed = false;
  let bubbleTimeout = null;

  // Show Toast Alert
  function showAlert(msg, duration = 4000) {
    alertBanner.textContent = msg;
    alertBanner.classList.add('visible');
    setTimeout(() => {
      alertBanner.classList.remove('visible');
    }, duration);
  }

  // Display floating speech bubble over Shanks
  function showSpeechBubble(text, duration = 6000) {
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleText.textContent = text;
    speechBubble.classList.add('visible');
    bubbleTimeout = setTimeout(() => {
      speechBubble.classList.remove('visible');
    }, duration);
  }

  // Append Message to Captain's Log
  function appendMessage(role, text, audioBase64 = null) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');
    msgDiv.className = `message-bubble ${role}`;

    const speakerName = role === 'user' ? 'YOU (PIRATE)' : 'RED HAIR SHANKS';

    let replayButtonHtml = '';
    if (audioBase64 && role === 'shanks') {
      replayButtonHtml = `
        <button class="replay-audio-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Replay Voice
        </button>
      `;
    }

    msgDiv.innerHTML = `
      <div class="message-meta">
        <span class="speaker-name">${speakerName}</span>
        <span class="message-time">${timeStr}</span>
      </div>
      <div class="message-text">${escapeHtml(text)}</div>
      ${replayButtonHtml}
    `;

    if (audioBase64 && role === 'shanks') {
      const btn = msgDiv.querySelector('.replay-audio-btn');
      btn.addEventListener('click', () => {
        audioPipeline.playResponseAudio(audioBase64);
      });
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Track in conversation history
    conversationHistory.push({ role: role === 'user' ? 'user' : 'shanks', text });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Handle Voice Recording Submission
  async function handleAudioRecordingComplete(audioBlob) {
    if (!audioBlob || audioBlob.size < 500) {
      avatar.setState('idle');
      return;
    }

    avatar.setState('thinking');
    pttStatusPill.innerHTML = '<span class="status-dot" style="background:#e5b358;box-shadow:0 0 8px #e5b358"></span> Thinking...';

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('history', JSON.stringify(conversationHistory.slice(-6)));

      const res = await fetch('/api/chat/voice', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server error processing voice.');
      }

      // Display user speech and Shanks reply in log
      if (data.userTranscript && !data.userTranscript.includes("(silence")) {
        appendMessage('user', data.userTranscript);
      }

      appendMessage('shanks', data.shanksReply, data.audio);
      showSpeechBubble(data.shanksReply);

      // Play audio response with real-time lip-sync
      if (data.audio) {
        audioPipeline.playResponseAudio(data.audio, () => {
          pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
        });
      } else {
        avatar.setState('idle');
        pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
      }
    } catch (err) {
      console.error("[App] Voice chat error:", err);
      showAlert(`Wind squall: ${err.message}`);
      avatar.setState('idle');
      pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
    }
  }

  // Handle Text Chat Submission
  async function handleTextSubmit() {
    const text = textInput.value.trim();
    if (!text) return;

    textInput.value = '';
    appendMessage('user', text);
    avatar.setState('thinking');
    pttStatusPill.innerHTML = '<span class="status-dot" style="background:#e5b358;box-shadow:0 0 8px #e5b358"></span> Thinking...';

    try {
      const res = await fetch('/api/chat/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-6)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Dialogue generation failed.');
      }

      appendMessage('shanks', data.shanksReply, data.audio);
      showSpeechBubble(data.shanksReply);

      if (data.audio) {
        audioPipeline.playResponseAudio(data.audio, () => {
          pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
        });
      } else {
        avatar.setState('idle');
        pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
      }
    } catch (err) {
      console.error("[App] Text chat error:", err);
      showAlert(`Error: ${err.message}`);
      avatar.setState('idle');
      pttStatusPill.innerHTML = '<span class="status-dot"></span> Ready (Push to Talk)';
    }
  }

  // PTT Press & Release Event Handlers
  async function onPttPress() {
    if (audioPipeline.isRecording) return;
    try {
      await audioPipeline.startRecording();
      pttButton.classList.add('recording');
      pttStatusPill.classList.add('recording');
      pttStatusPill.innerHTML = '<span class="status-dot"></span> Listening...';
    } catch (err) {
      showAlert('Microphone access blocked. Check browser permissions.');
    }
  }

  async function onPttRelease() {
    if (!audioPipeline.isRecording) return;
    pttButton.classList.remove('recording');
    pttStatusPill.classList.remove('recording');
    const audioBlob = await audioPipeline.stopRecording();
    await handleAudioRecordingComplete(audioBlob);
  }

  // Mouse / Pointer Event Listeners for PTT
  pttButton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onPttPress();
  });

  window.addEventListener('pointerup', () => {
    if (audioPipeline.isRecording) {
      onPttRelease();
    }
  });

  // Spacebar Hotkey for Push-To-Talk
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isSpacePressed && document.activeElement !== textInput) {
      e.preventDefault();
      isSpacePressed = true;
      onPttPress();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && isSpacePressed && document.activeElement !== textInput) {
      e.preventDefault();
      isSpacePressed = false;
      onPttRelease();
    }
  });

  // Text Chat Listeners
  sendButton.addEventListener('click', handleTextSubmit);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextSubmit();
    }
  });

  // Haki Button VFX Trigger
  hakiButton.addEventListener('click', () => {
    avatar.setState('haki');
    audioPipeline.playHakiBoom();
    haki.triggerHakiBurst(1.8);
    showSpeechBubble("Dahahahaha! Feel the weight of Haoshoku Haki!", 3000);
    setTimeout(() => {
      avatar.setState('idle');
    }, 1500);
  });

  // Clear Log
  clearLogBtn.addEventListener('click', () => {
    messagesContainer.innerHTML = '';
    conversationHistory.length = 0;
  });

  // Fetch initial greeting
  fetch('/api/shanks/greeting')
    .then(r => r.json())
    .then(data => {
      appendMessage('shanks', data.text);
      showSpeechBubble(data.text);
    })
    .catch(() => {
      const defaultGreeting = "Dahahahaha! Welcome aboard the Red Force, mate! Pour yourself some West Blue sake and take a seat.";
      appendMessage('shanks', defaultGreeting);
      showSpeechBubble(defaultGreeting);
    });
});
