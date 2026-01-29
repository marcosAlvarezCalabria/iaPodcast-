import { MsEdgeTTS } from "edge-tts";
import { ProviderCallError } from "../errors";
import type { ProviderContext, TTSRequest, TTSResult } from "../types";
import type { TTSProvider } from "./TTSProvider";

const defaultVoiceByLanguage: Record<string, string> = {
  "es": "es-ES-AlvaroNeural",
  "es-es": "es-ES-AlvaroNeural",
  "es-mx": "es-MX-DaliaNeural",
  "en": "en-US-GuyNeural",
  "en-us": "en-US-GuyNeural",
  "en-gb": "en-US-JennyNeural",
};

const resolveVoice = (req: TTSRequest): string => {
  if (req.voice) {
    return req.voice;
  }
  const normalized = req.language.trim().toLowerCase();
  const direct = defaultVoiceByLanguage[normalized];
  if (direct) {
    return direct;
  }
  if (normalized.startsWith("es-mx")) {
    return "es-MX-DaliaNeural";
  }
  if (normalized.startsWith("es")) {
    return "es-ES-AlvaroNeural";
  }
  if (normalized.startsWith("en")) {
    return "en-US-GuyNeural";
  }
  return "en-US-GuyNeural";
};

const streamToBuffer = async (stream: AsyncIterable<Buffer>): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const createEdgeTTSProvider = (): TTSProvider => {
  return {
    name: () => "edge",
    async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
      try {
        const voice = resolveVoice(req);
        const outputFormat =
          MsEdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, outputFormat);
        ctx?.logger?.debug("edge:speak", {
          voice,
          language: req.language,
          format: req.format ?? "mp3",
        });
        const audioStream = tts.toStream(req.text);
        const audio = await streamToBuffer(audioStream);
        return {
          audio,
          mimeType: "audio/mpeg",
        };
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
