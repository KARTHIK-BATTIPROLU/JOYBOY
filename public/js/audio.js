// Web Audio API Pipeline: Microphone Recording, AnalyserNode Lip-Sync & Synthesis

class AudioPipeline {
  constructor(avatarInstance, hakiInstance) {
    this.avatar = avatarInstance;
    this.haki = hakiInstance;
    this.audioCtx = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPlaying = false;
    this.currentAudioElement = null;
    this.envelopeEnergy = 0;
    this.lipSyncAnimId = null;

    this.initAudioContext();
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Starts microphone recording via MediaRecorder
   */
  async startRecording() {
    this.ensureAudioContext();
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.avatar.setState('listening');
      this.playChime(350, 440, 0.15); // PTT press chime
    } catch (err) {
      console.error("[AudioPipeline] Microphone access denied or failed:", err);
      throw err;
    }
  }

  /**
   * Stops recording and returns the audio Blob
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        return resolve(null);
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
        // Stop all tracks to release microphone hardware indicator
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        this.isRecording = false;
        this.playChime(440, 350, 0.12); // PTT release chime
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Plays base64/URL MP3 audio and drives real-time avatar lip-sync
   */
  async playResponseAudio(audioSrc, onEndCallback) {
    this.ensureAudioContext();

    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }

    if (!audioSrc) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = audioSrc;
    this.currentAudioElement = audio;

    // Connect to Web Audio AnalyserNode for real-time FFT
    if (this.audioCtx) {
      const source = this.audioCtx.createMediaElementSource(audio);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.5;

      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }

    this.isPlaying = true;
    this.avatar.setState('speaking');

    // Trigger subtle Haki aura flare on speech start
    if (this.haki) {
      this.haki.triggerHakiBurst(0.6);
    }

    this.startLipSyncLoop();

    audio.onended = () => {
      this.isPlaying = false;
      this.stopLipSyncLoop();
      this.avatar.setMouthViseme(0);
      this.avatar.setState('idle');
      if (onEndCallback) onEndCallback();
    };

    audio.onerror = (e) => {
      console.error("[AudioPipeline] Audio playback error:", e);
      this.isPlaying = false;
      this.stopLipSyncLoop();
      this.avatar.setState('idle');
      if (onEndCallback) onEndCallback();
    };

    try {
      await audio.play();
    } catch (playErr) {
      console.warn("[AudioPipeline] Autoplay failed:", playErr);
      this.isPlaying = false;
      this.stopLipSyncLoop();
      this.avatar.setState('idle');
      if (onEndCallback) onEndCallback();
    }
  }

  /**
   * Real-time Lip-Sync loop driven by AnalyserNode frequency & amplitude
   */
  startLipSyncLoop() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.isPlaying) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Compute RMS amplitude focusing on vocal frequencies (bins 8 to 80 ~ 300Hz-3000Hz)
      let sum = 0;
      let count = 0;
      for (let i = 8; i < 80 && i < dataArray.length; i++) {
        sum += dataArray[i];
        count++;
      }
      const rawLevel = count > 0 ? (sum / count) / 255 : 0;

      // Fast-attack, smooth-decay envelope follower
      if (rawLevel > this.envelopeEnergy) {
        this.envelopeEnergy += (rawLevel - this.envelopeEnergy) * 0.75; // Fast attack
      } else {
        this.envelopeEnergy += (rawLevel - this.envelopeEnergy) * 0.25; // Smooth decay
      }

      // Map envelope energy to mouth viseme openness (0.0 to 1.0)
      const visemeValue = Math.min(1.0, this.envelopeEnergy * 1.6);
      this.avatar.setMouthViseme(visemeValue);

      this.lipSyncAnimId = requestAnimationFrame(update);
    };

    this.lipSyncAnimId = requestAnimationFrame(update);
  }

  stopLipSyncLoop() {
    if (this.lipSyncAnimId) {
      cancelAnimationFrame(this.lipSyncAnimId);
      this.lipSyncAnimId = null;
    }
    this.envelopeEnergy = 0;
    this.avatar.setMouthViseme(0);
  }

  /**
   * Synthesizes audio cues (PTT button sound, Haki sound) using Web Audio API
   */
  playChime(freq1, freq2, duration = 0.15) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq2, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio context may be closed
    }
  }

  playHakiBoom() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, this.audioCtx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.65);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.65);
    } catch {}
  }
}
