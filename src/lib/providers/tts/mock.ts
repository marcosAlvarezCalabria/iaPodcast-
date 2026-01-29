import type { ProviderContext, TTSRequest, TTSResult, Usage } from "../types";
import type { TTSProvider } from "./TTSProvider";

const estimateDurationSeconds = (text: string, speakingRate?: number): number => {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const baseWordsPerSecond = 2;
  const rate = speakingRate && speakingRate > 0 ? speakingRate : 1;
  const seconds = wordCount / (baseWordsPerSecond * rate);
  return Math.max(1, Math.ceil(seconds));
};

const createSilentWav = (durationSec: number, sampleRate = 16000): Buffer => {
  const numSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
};

export const createMockTTSProvider = (): TTSProvider => {
  return {
    name: () => "mock",
    async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
      ctx?.logger?.debug("mock:speak", { length: req.text.length });
      const durationSec = estimateDurationSeconds(req.text, req.speakingRate);
      const audio = createSilentWav(durationSec);
      const usage: Usage = {
        audioSecondsIn: durationSec,
        audioSecondsOut: durationSec,
        provider: "mock",
        model: "mock-tts",
      };
      ctx?.onUsage?.(usage);
      return {
        audio,
        mimeType: "audio/wav",
        durationSec,
        usage,
      };
    },
  };
};
