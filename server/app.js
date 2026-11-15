// Express App Definition with Endpoints for Voice, Chat, and Audio
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { generateShanksReply, transcribeAudio, synthesizeSpeech, DEFAULT_GEMINI_MODEL, DEFAULT_TTS_VOICE } = require('./services');
const { getShanksGreeting, sanitizeForSpeech } = require('./shanks');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max audio
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health / Status Endpoint
app.get('/api/config/status', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JOYBOY — Red Hair Shanks AI Voice Chatbot',
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    ttsVoice: process.env.DEEPGRAM_TTS_VOICE || DEFAULT_TTS_VOICE,
    sttModel: process.env.DEEPGRAM_STT_MODEL || 'nova-2',
    timestamp: new Date().toISOString()
  });
});

// Shanks Initial Greeting Endpoint
app.get('/api/shanks/greeting', (req, res) => {
  res.json({
    text: getShanksGreeting()
  });
});

// Unified Voice Pipeline Endpoint: Audio In -> STT -> Gemini -> TTS -> Audio Out
app.post('/api/chat/voice', upload.single('audio'), async (req, res) => {
  try {
    let audioBuffer = null;
    let mimeType = 'audio/webm';
    let history = [];

    // Check if multipart upload or base64 json
    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'audio/webm';
      if (req.body.history) {
        try {
          history = typeof req.body.history === 'string' ? JSON.parse(req.body.history) : req.body.history;
        } catch {
          history = [];
        }
      }
    } else if (req.body.audio) {
      // Base64 audio
      const rawBase64 = req.body.audio.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(rawBase64, 'base64');
      mimeType = req.body.mimeType || 'audio/webm';
      history = req.body.history || [];
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ success: false, error: "No audio data received." });
    }

    // Step 1: Speech-to-Text via Deepgram Nova-2
    console.log(`[Voice Pipeline] Transcribing audio buffer (${audioBuffer.length} bytes, ${mimeType})...`);
    let userTranscript = "";
    try {
      userTranscript = await transcribeAudio(audioBuffer, mimeType);
    } catch (sttErr) {
      console.error("[Voice Pipeline] STT error:", sttErr.message);
      return res.status(500).json({
        success: false,
        error: `Transcription failed: ${sttErr.message}`,
        stage: 'stt'
      });
    }

    if (!userTranscript || userTranscript.trim().length === 0) {
      return res.json({
        success: true,
        userTranscript: "(silence / no speech detected)",
        shanksReply: "Dahahahaha! Speak up, friend! The sea breeze swallowed your words. What did you say?",
        audio: null
      });
    }

    console.log(`[Voice Pipeline] User said: "${userTranscript}"`);

    // Step 2: Dialogue generation via Gemini 3.5 Flash
    console.log("[Voice Pipeline] Generating Shanks dialogue via Gemini...");
    let shanksReply = "";
    try {
      shanksReply = await generateShanksReply(userTranscript, history);
    } catch (llmErr) {
      console.error("[Voice Pipeline] LLM error:", llmErr.message);
      shanksReply = "Dahahahaha! Don't worry about it, mate. Whatever you're facing on these seas, hold your head high!";
    }

    console.log(`[Voice Pipeline] Shanks replied: "${shanksReply}"`);

    // Step 3: Text-to-Speech via Deepgram Aura
    let audioBase64 = null;
    try {
      console.log("[Voice Pipeline] Synthesizing Shanks voice audio via Deepgram Aura...");
      const ttsBuffer = await synthesizeSpeech(shanksReply);
      audioBase64 = ttsBuffer.toString('base64');
    } catch (ttsErr) {
      console.error("[Voice Pipeline] TTS error:", ttsErr.message);
      // Even if TTS fails, still return dialogue text
    }

    return res.json({
      success: true,
      userTranscript,
      shanksReply,
      audio: audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null,
      format: "audio/mp3"
    });
  } catch (err) {
    console.error("[Voice Pipeline] Unhandled exception:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// Text Chat Endpoint: Text In -> Gemini -> TTS -> Audio Out
app.post('/api/chat/text', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Message text is required." });
    }

    console.log(`[Text Chat] User said: "${message}"`);
    const shanksReply = await generateShanksReply(message, history || []);
    console.log(`[Text Chat] Shanks replied: "${shanksReply}"`);

    let audioBase64 = null;
    try {
      const ttsBuffer = await synthesizeSpeech(shanksReply);
      audioBase64 = ttsBuffer.toString('base64');
    } catch (ttsErr) {
      console.error("[Text Chat] TTS error:", ttsErr.message);
    }

    return res.json({
      success: true,
      userMessage: message,
      shanksReply,
      audio: audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null,
      format: "audio/mp3"
    });
  } catch (err) {
    console.error("[Text Chat] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Direct TTS Endpoint (for replay or standalone phrases)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required." });
    }

    const ttsBuffer = await synthesizeSpeech(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', ttsBuffer.length);
    return res.send(ttsBuffer);
  } catch (err) {
    console.error("[TTS Endpoint] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
