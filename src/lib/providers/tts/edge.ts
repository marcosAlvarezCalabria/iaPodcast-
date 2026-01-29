import { ProviderCallError } from "../errors";
import type { ProviderContext, TTSRequest, TTSResult } from "../types";
import type { TTSProvider } from "./TTSProvider";

const defaultVoiceByLanguage: Record<string, string> = {
  "es": "es-ES-AlvaroNeural",
  "es-es": "es-ES-AlvaroNeural",
  "es-mx": "es-MX-DaliaNeural",
  "en": "en-US-GuyNeural",
  "en-us": "en-US-GuyNeural",
  "en-gb": "en-GB-RyanNeural",
};

const resolveVoice = (language: string, voice?: string): string => {
  if (voice) {
    return voice;
  }
  const normalized = language.trim().toLowerCase();
  const direct = defaultVoiceByLanguage[normalized];
  if (direct) {
    return direct;
  }
  if (normalized.startsWith("es")) {
    return "es-ES-AlvaroNeural";
  }
  if (normalized.startsWith("en")) {
    return "en-US-GuyNeural";
  }
  return "en-US-GuyNeural";
};

export const createEdgeTTSProvider = (): TTSProvider => {
  return {
    name: () => "edge",
    async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
      try {
        // Dynamic import to avoid bundling issues
        const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");

        const voice = resolveVoice(req.language, req.voice);
        ctx?.logger?.debug("edge:speak", {
          voice,
          language: req.language,
          length: req.text.length,
        });

        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const { audioStream } = tts.toStream(req.text);
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
          audioStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          audioStream.on("end", () => {
            const audio = Buffer.concat(chunks);
            resolve({
              audio,
              mimeType: "audio/mpeg",
            });
          });
          audioStream.on("error", (err: Error) => {
            reject(new ProviderCallError(err.message, {
              provider: "edge",
              cause: err,
            }));
          });
        });
      } catch (error) {
        throw new ProviderCallError(
          error instanceof Error ? error.message : String(error),
          {
            provider: "edge",
            cause: error,
          },
        );
      }
    },
  };
};
