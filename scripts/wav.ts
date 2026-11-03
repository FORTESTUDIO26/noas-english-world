// Tiny helpers: decode MP3 (mpg123 wasm) to PCM and write 16-bit mono WAV.
import fs from 'node:fs';
import { MPEGDecoder } from 'mpg123-decoder';

export interface Pcm { data: Float32Array; rate: number }

let decoder: MPEGDecoder | null = null;
export async function decodeMp3(file: string): Promise<Pcm> {
  if (!decoder) {
    decoder = new MPEGDecoder();
    await decoder.ready;
  } else {
    await decoder.reset();
  }
  const r = decoder.decode(new Uint8Array(fs.readFileSync(file)));
  return { data: r.channelData[0], rate: r.sampleRate };
}

export function freeDecoder() {
  decoder?.free();
  decoder = null;
}

export function resample(p: Pcm, rate: number): Pcm {
  if (p.rate === rate) return p;
  const ratio = p.rate / rate;
  const out = new Float32Array(Math.floor(p.data.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const f = x - i0;
    out[i] = (p.data[i0] ?? 0) * (1 - f) + (p.data[i0 + 1] ?? 0) * f;
  }
  return { data: out, rate };
}

export function wavBytes(p: Pcm): Buffer {
  const n = p.data.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(p.rate, 24);
  buf.writeUInt32LE(p.rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(p.data[i] * 32767))), 44 + i * 2);
  return buf;
}

export function readWav(file: string): Pcm {
  const b = fs.readFileSync(file);
  const rate = b.readUInt32LE(24);
  const n = (b.length - 44) / 2;
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = b.readInt16LE(44 + i * 2) / 32768;
  return { data, rate };
}
