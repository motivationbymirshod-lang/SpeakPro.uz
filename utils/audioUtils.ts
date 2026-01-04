import { Blob } from "@google/genai";

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function pcmToGeminiBlob(data: Float32Array, sampleRate: number): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Convert Float32 (-1.0 to 1.0) to Int16
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
  }
  
  const uint8 = new Uint8Array(int16.buffer);
  const base64 = arrayBufferToBase64(uint8.buffer);

  return {
    data: base64,
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Use DataView to ensure we read Little Endian 16-bit PCM correctly regardless of system architecture
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  // Calculate frame count (2 bytes per sample)
  const frameCount = Math.floor(data.byteLength / 2 / numChannels);
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Offset: i * (bytes_per_sample * channels) + (channel * bytes_per_sample)
      const offset = (i * 2 * numChannels) + (channel * 2);
      
      // Read Int16 Little Endian
      const int16 = dataView.getInt16(offset, true);
      
      // Convert to Float32 range [-1.0, 1.0]
      channelData[i] = int16 / 32768.0;
    }
  }
  return buffer;
}