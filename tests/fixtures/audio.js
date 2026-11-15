/**
 * Audio Fixtures for Project JOYBOY E2E Test Suite
 * Provides valid WebM/Opus, RIFF/WAV, Silence, and Corrupted audio payloads.
 */

// 1. Minimal Valid Canonical 44-byte RIFF/WAV Generator
function createWavBuffer({ sampleRate = 16000, numChannels = 1, durationSec = 0.1, toneFreq = 440, isSilence = false } = {}) {
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = Math.floor(sampleRate * numChannels * bytesPerSample * durationSec);
  const buffer = Buffer.alloc(44 + dataSize);

  // Header chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // Format chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);            // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);             // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);   // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);    // SampleRate
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);              // BlockAlign
  buffer.writeUInt16LE(bytesPerSample * 8, 34);                        // BitsPerSample

  // Data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  if (!isSilence && toneFreq > 0) {
    for (let i = 0; i < dataSize / 2; i++) {
      const sample = Math.floor(Math.sin((2 * Math.PI * toneFreq * i) / sampleRate) * 12000);
      buffer.writeInt16LE(sample, 44 + i * 2);
    }
  } // if isSilence, buffer is already zero-filled by Buffer.alloc

  return buffer;
}

// 2. Minimal Valid WebM EBML Opus Audio Container Generator
function createWebmOpusBuffer() {
  function ebmlElement(id, data) {
    const idBuf = Buffer.isBuffer(id) ? id : Buffer.from(id);
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = dataBuf.length;
    let sizeBuf;
    if (len < 0x7f) {
      sizeBuf = Buffer.from([0x80 | len]);
    } else if (len < 0x3fff) {
      sizeBuf = Buffer.from([0x40 | (len >> 8), len & 0xff]);
    } else {
      sizeBuf = Buffer.from([0x20 | (len >> 16), (len >> 8) & 0xff, len & 0xff]);
    }
    return Buffer.concat([idBuf, sizeBuf, dataBuf]);
  }

  // EBML Header
  const ebmlBody = Buffer.concat([
    ebmlElement([0x42, 0x86], [0x01]), // EBMLVersion = 1
    ebmlElement([0x42, 0xf7], [0x01]), // EBMLReadVersion = 1
    ebmlElement([0x42, 0xf2], [0x04]), // EBMLMaxIDLength = 4
    ebmlElement([0x42, 0xf3], [0x08]), // EBMLMaxSizeLength = 8
    ebmlElement([0x42, 0x82], Buffer.from('webm', 'ascii')), // DocType = 'webm'
    ebmlElement([0x42, 0x87], [0x04]), // DocTypeVersion = 4
    ebmlElement([0x42, 0x85], [0x02]), // DocTypeReadVersion = 2
  ]);
  const ebmlHeader = ebmlElement([0x1a, 0x45, 0xdf, 0xa3], ebmlBody);

  // Track Entry: Opus Audio
  const trackEntry = Buffer.concat([
    ebmlElement([0xd7], [0x01]), // TrackNumber = 1
    ebmlElement([0x73, 0xc5], [0x01]), // TrackUID = 1
    ebmlElement([0x83], [0x02]), // TrackType = 2 (audio)
    ebmlElement([0x86], Buffer.from('A_OPUS', 'ascii')), // CodecID
    ebmlElement([0xe1], Buffer.concat([ // Audio
      ebmlElement([0xb5], Buffer.from('40e7700000000000', 'hex')), // 48000.0 Hz
      ebmlElement([0x9f], [0x01]) // Channels = 1
    ]))
  ]);
  const tracks = ebmlElement([0x16, 0x54, 0xae, 0x6b], trackEntry);
  const segment = ebmlElement([0x18, 0x53, 0x80, 0x67], tracks);

  return Buffer.concat([ebmlHeader, segment]);
}

// 3. Precomputed Fixtures
const wavToneBuffer = createWavBuffer({ durationSec: 0.2, toneFreq: 440 });
const wavSilenceBuffer = createWavBuffer({ durationSec: 1.0, isSilence: true });
const webmOpusBuffer = createWebmOpusBuffer();

// MPEG-1 Audio Layer III valid sync frame for mock TTS
const mp3DummyBuffer = Buffer.from([
  0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00
]);

module.exports = {
  createWavBuffer,
  createWebmOpusBuffer,

  // WAV Fixtures
  WAV_TONE_BUFFER: wavToneBuffer,
  WAV_TONE_BASE64: wavToneBuffer.toString('base64'),
  WAV_SILENCE_BUFFER: wavSilenceBuffer,
  WAV_SILENCE_BASE64: wavSilenceBuffer.toString('base64'),

  // WebM / Opus Fixtures
  WEBM_OPUS_BUFFER: webmOpusBuffer,
  WEBM_OPUS_BASE64: webmOpusBuffer.toString('base64'),

  // MP3 TTS Fixture
  MP3_DUMMY_BUFFER: mp3DummyBuffer,
  MP3_DUMMY_BASE64: mp3DummyBuffer.toString('base64'),

  // Boundary Fixtures
  EMPTY_AUDIO_BASE64: '',
  CORRUPTED_AUDIO_BASE64: Buffer.from('RIFF\x00\x00\x00\x00CORRUPTED_NON_AUDIO_BYTES_DEADBEEF').toString('base64'),
  OVERSIZED_AUDIO_BASE64: Buffer.alloc(11 * 1024 * 1024).toString('base64') // 11MB to test payload limits
};
