# 🏴‍☠️ JOYBOY — Red Hair Shanks AI Voice Chatbot

An interactive, animated AI voice chatbot embodying **Red Hair Shanks** from *One Piece*, featuring real-time speech-to-text, in-character persona intelligence powered by Google Gemini, high-fidelity voice synthesis powered by Deepgram Aura, and a 2D animated avatar with real-time audio-synchronized lip-sync and Conqueror's Haki VFX.

---

## ⚔️ Features

- **Red Hair Shanks Persona**: Embodying the charismatic, easy-going Emperor of the Sea with his iconic laughter (*"Dahahahaha!"*), lore-accurate references (Gol D. Roger, Anchor Luffy, West Blue sake, Gryphon saber), and unwavering pirate honor.
- **Voice-First Interaction (Push-to-Talk)**:
  - Hold the central glowing PTT button or press and hold `[Spacebar]` to talk.
  - Real-time speech transcription via **Deepgram Nova-2** (<300ms latency).
- **Gemini Dialogue Engine**:
  - Contextual dialogue powered by **Gemini 3.5 Flash** with multi-turn conversation memory.
  - Strict spoken voice filtering (zero markdown/stage directions) for natural audio delivery.
- **Deepgram Aura Voice Synthesis**:
  - Voice audio generated via Deepgram's **`aura-zeus-en`** commanding baritone voice.
- **Interactive 2D Animated Avatar**:
  - Pure SVG vector art: vivid red hair, 3 diagonal scars across the left eye, empty pinned left sleeve, Gryphon saber.
  - Sinusoidal natural breathing, randomized natural blinking, and subtle cursor eye tracking.
  - Real-time FFT Viseme Lip-Sync driven by Web Audio API `AnalyserNode`.
- **Conqueror's Haki VFX**:
  - Procedural HTML5 Canvas rendering of branching crimson & black lightning arcs with screen tremor physics.
- **Captain's Log**:
  - Live conversation history transcript with per-message audio replay.
- **Multi-Modal Fallback**:
  - Full text input console for environments without microphone access.
  - Built-in multi-key fallback handling to ensure 100% uptime.

---

## 🚀 Quick Start (Local Run)

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v22)
- **npm** v9+

### 2. Install Dependencies
```bash
cd JOYBOY
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains your Gemini and Deepgram API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
PORT=3000
```

### 4. Run the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## ☁️ Deploy to Vercel

This repository is pre-configured for instant deployment on [Vercel](https://vercel.com).

### Via Vercel CLI
```bash
vercel --prod
```

### Environment Variables on Vercel
In your Vercel Project Settings, add:
- `GEMINI_API_KEY`
- `DEEPGRAM_API_KEY`

---

## 📂 Project Structure

```
JOYBOY/
├── api/
│   └── index.js             # Vercel Serverless Function entry point
├── public/
│   ├── index.html           # Nautical Red Force UI
│   ├── style.css            # Pirate theme, animations & layouts
│   └── js/
│       ├── avatar.js        # 2D SVG avatar controller & viseme morphing
│       ├── haki.js          # Conqueror's Haki canvas VFX engine
│       ├── audio.js         # Web Audio API recording & FFT lip-sync
│       └── app.js           # Main state machine & API communications
├── server/
│   ├── app.js               # Express application routes & pipeline
│   ├── services.js          # Gemini & Deepgram API callers with fallback
│   └── shanks.js            # Shanks persona prompts & text sanitizer
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Node dependencies and scripts
├── server.js                # Standalone local Express server
├── vercel.json              # Vercel routing configuration
└── README.md                # Documentation
```

---

## 📜 License
MIT License. Created by Karthik Battiprolu.
