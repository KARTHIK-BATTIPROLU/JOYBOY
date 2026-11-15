/**
 * Mock Server Harness for Google Gemini & Deepgram APIs
 * Zero-dependency standalone HTTP server simulating 200, 401, 429, 500, and socket dropouts.
 */

const http = require('node:http');

class MockApiServer {
  constructor() {
    this.server = null;
    this.port = null;
    this.url = null;

    // Default Scenarios
    this.geminiScenario = 'success';        // 'success' | 'stage_directions' | '401' | '429' | '500' | 'timeout'
    this.deepgramSttScenario = 'success';    // 'success' | 'silence' | '401' | '429' | '500' | 'timeout'
    this.deepgramTtsScenario = 'success';    // 'success' | '401' | '429' | '500' | 'timeout'

    // Mock Data Customizers
    this.customShanksReply = 'Dahahahaha! That straw hat belonged to Captain Roger!';
    this.customUserTranscript = 'Where is the One Piece?';
    this.customTtsAudioBuffer = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);

    // Request Log
    this.requestLog = [];
    this.originalFetch = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          this.requestLog.push({
            method: req.method,
            url: req.url,
            headers: req.headers,
            bodyLength: body.length,
            bodyText: body.toString('utf-8').slice(0, 1000)
          });

          // Route to Gemini
          if (req.url.includes('generateContent')) {
            return this._handleGemini(req, res, body);
          }
          // Route to Deepgram STT
          if (req.url.includes('/v1/listen')) {
            return this._handleDeepgramStt(req, res, body);
          }
          // Route to Deepgram TTS
          if (req.url.includes('/v1/speak')) {
            return this._handleDeepgramTts(req, res, body);
          }

          // Fallback Health Check
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'mock_server_ready' }));
        });
      });

      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        this.url = `http://127.0.0.1:${this.port}`;
        resolve(this.url);
      });
    });
  }

  enableInterceptor() {
    if (this.originalFetch) return; // already enabled
    this.originalFetch = globalThis.fetch;
    const mockUrl = this.url;

    globalThis.fetch = async (input, init) => {
      let rawUrl = '';
      if (typeof input === 'string') {
        rawUrl = input;
      } else if (input && typeof input.url === 'string') {
        rawUrl = input.url;
      }

      if (rawUrl.includes('generativelanguage.googleapis.com') || rawUrl.includes('api.deepgram.com')) {
        const parsed = new URL(rawUrl);
        const redirectedUrl = `${mockUrl}${parsed.pathname}${parsed.search}`;
        if (typeof input === 'string') {
          return this.originalFetch(redirectedUrl, init);
        } else {
          return this.originalFetch(new Request(redirectedUrl, input), init);
        }
      }

      return this.originalFetch(input, init);
    };
  }

  disableInterceptor() {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  _handleGemini(req, res, body) {
    if (this.geminiScenario === 'timeout') {
      return req.socket.destroy(); // Sudden connection reset
    }
    if (this.geminiScenario === '401') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: { code: 401, message: 'API key not valid. Please pass a valid API key.', status: 'UNAUTHENTICATED' }
      }));
    }
    if (this.geminiScenario === '429') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: { code: 429, message: 'Quota exceeded for GenerateContent requests.', status: 'RESOURCE_EXHAUSTED' }
      }));
    }
    if (this.geminiScenario === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: { code: 500, message: 'Internal service error occurred in Gemini.', status: 'INTERNAL' }
      }));
    }
    if (this.geminiScenario === 'stage_directions') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: '*chuckles warmly and puts a hand on his sword* Dahahahaha! [grins] Pour some sake, mate!' }]
          },
          finishReason: 'STOP'
        }]
      }));
    }

    // Default 200 OK
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: this.customShanksReply }]
        },
        finishReason: 'STOP'
      }]
    }));
  }

  _handleDeepgramStt(req, res, body) {
    if (this.deepgramSttScenario === 'timeout') {
      return req.socket.destroy();
    }
    if (this.deepgramSttScenario === '401') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ err_code: 'INVALID_AUTH', err_msg: 'Invalid Deepgram API key.' }));
    }
    if (this.deepgramSttScenario === '429') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ err_code: 'RATE_LIMITED', err_msg: 'Deepgram rate limit reached.' }));
    }
    if (this.deepgramSttScenario === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ err_code: 'INTERNAL_SERVER_ERROR', err_msg: 'Deepgram transcription engine error.' }));
    }
    if (this.deepgramSttScenario === 'silence') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        results: { channels: [{ alternatives: [{ transcript: '', confidence: 0.0 }] }] }
      }));
    }

    // Default 200 OK
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      results: { channels: [{ alternatives: [{ transcript: this.customUserTranscript, confidence: 0.98 }] }] }
    }));
  }

  _handleDeepgramTts(req, res, body) {
    if (this.deepgramTtsScenario === 'timeout') {
      return req.socket.destroy();
    }
    if (this.deepgramTtsScenario === '401') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ err_code: 'INVALID_AUTH', err_msg: 'Invalid Deepgram API key.' }));
    }
    if (this.deepgramTtsScenario === '429') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ err_code: 'RATE_LIMITED', err_msg: 'Too many TTS requests.' }));
    }
    if (this.deepgramTtsScenario === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Deepgram voice synthesizer crashed.' }));
    }

    // Default 200 OK: stream MP3 binary
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': this.customTtsAudioBuffer.length
    });
    res.end(this.customTtsAudioBuffer);
  }

  reset() {
    this.geminiScenario = 'success';
    this.deepgramSttScenario = 'success';
    this.deepgramTtsScenario = 'success';
    this.requestLog = [];
  }

  async stop() {
    this.disableInterceptor();
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = { MockApiServer };
