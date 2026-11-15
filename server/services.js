// External API Services for Gemini and Deepgram with Key Normalization and Fallback
const { SHANKS_SYSTEM_INSTRUCTION, sanitizeForSpeech } = require('./shanks');

function normalizeKey(key) {
  if (!key) return "";
  return key.replace(/\s+/g, "").trim();
}

const PRIMARY_GEMINI_KEY = normalizeKey(process.env.GEMINI_API_KEY || "");
const FALLBACK_GEMINI_KEY = normalizeKey(process.env.GEMINI_FALLBACK_KEY || "");

const PRIMARY_DEEPGRAM_KEY = normalizeKey(process.env.DEEPGRAM_API_KEY || "");
const FALLBACK_DEEPGRAM_KEY = normalizeKey(process.env.DEEPGRAM_FALLBACK_KEY || "");

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const DEFAULT_TTS_VOICE = process.env.DEEPGRAM_TTS_VOICE || "aura-zeus-en";

/**
 * Call Gemini API with automatic fallback on 401/403.
 */
async function generateShanksReply(userMessage, chatHistory = [], model = DEFAULT_GEMINI_MODEL) {
  const keysToTry = [PRIMARY_GEMINI_KEY, FALLBACK_GEMINI_KEY].filter(Boolean);
  let lastError = null;

  // Build Gemini contents array
  const contents = [];
  if (Array.isArray(chatHistory)) {
    for (const msg of chatHistory) {
      if (msg.text && (msg.role === 'user' || msg.role === 'shanks' || msg.role === 'model')) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
  }

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const requestBody = {
    contents,
    system_instruction: {
      parts: [{ text: SHANKS_SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 250,
      topP: 0.95
    }
  };

  for (const apiKey of keysToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401 || response.status === 403) {
        console.warn(`[Gemini] Key ending in ...${apiKey.slice(-6)} returned ${response.status}. Trying next key...`);
        lastError = new Error(`Gemini authentication error (${response.status})`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        throw new Error("Gemini returned empty candidate response.");
      }

      return replyText.trim();
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        continue;
      }
      throw err;
    }
  }

  // If all keys fail, return in-character fallback
  console.error("[Gemini] All keys failed:", lastError?.message);
  return "Dahahahaha! The Grand Line winds are howling too loud right now, mate! Say that again, and speak with your pirate chest!";
}

/**
 * Transcribes audio buffer via Deepgram Nova-2 STT.
 */
async function transcribeAudio(audioBuffer, mimeType = "audio/webm") {
  const keysToTry = [PRIMARY_DEEPGRAM_KEY, FALLBACK_DEEPGRAM_KEY].filter(Boolean);
  let lastError = null;

  for (const apiKey of keysToTry) {
    try {
      const cleanKey = normalizeKey(apiKey);
      const url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Token ${cleanKey}`,
          "Content-Type": mimeType
        },
        body: audioBuffer
      });

      if (response.status === 401 || response.status === 403) {
        console.warn(`[Deepgram STT] Key ending in ...${cleanKey.slice(-6)} returned ${response.status}. Trying next key...`);
        lastError = new Error(`Deepgram STT authentication error (${response.status})`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Deepgram STT error [${response.status}]: ${errText}`);
      }

      const data = await response.json();
      const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      return transcript.trim();
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Deepgram STT transcription failed across all keys.");
}

/**
 * Synthesizes text to speech via Deepgram Aura TTS.
 */
async function synthesizeSpeech(text, voice = DEFAULT_TTS_VOICE) {
  const cleanText = sanitizeForSpeech(text);
  if (!cleanText) {
    throw new Error("No readable text provided for speech synthesis.");
  }

  const keysToTry = [PRIMARY_DEEPGRAM_KEY, FALLBACK_DEEPGRAM_KEY].filter(Boolean);
  let lastError = null;

  for (const apiKey of keysToTry) {
    try {
      const cleanKey = normalizeKey(apiKey);
      const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}&encoding=mp3`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Token ${cleanKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: cleanText })
      });

      if (response.status === 401 || response.status === 403) {
        console.warn(`[Deepgram TTS] Key ending in ...${cleanKey.slice(-6)} returned ${response.status}. Trying next key...`);
        lastError = new Error(`Deepgram TTS authentication error (${response.status})`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Deepgram TTS error [${response.status}]: ${errText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Deepgram TTS synthesis failed across all keys.");
}

module.exports = {
  generateShanksReply,
  transcribeAudio,
  synthesizeSpeech,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_TTS_VOICE
};
