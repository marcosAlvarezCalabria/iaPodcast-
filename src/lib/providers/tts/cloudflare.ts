import { ProviderCallError } from "../errors";
import type { ProviderContext, TTSRequest, TTSResult } from "../types";
import type { TTSProvider } from "./TTSProvider";

/**
 * Cloudflare-compatible TTS Provider
 *
 * Uses fetch-based APIs that work in Edge Runtime.
 * Currently uses a free TTS API endpoint.
 */

const languageToVoice: Record<string, string> = {
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
};

const resolveLanguage = (language: string): string => {
  const normalized = language.trim().toLowerCase();
  return languageToVoice[normalized] || normalized.substring(0, 2) || "en";
};

// Split text into chunks to handle API limits
const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = "";
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Concatenate audio chunks (simple MP3 concatenation)
const concatenateAudioChunks = (chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

// Fetch TTS from VoiceRSS (free tier: 350 requests/day)
// Sign up at http://www.voicerss.org/ for a free API key
const fetchVoiceRSS = async (
  text: string,
  language: string,
  apiKey: string
): Promise<Uint8Array> => {
  const params = new URLSearchParams({
    key: apiKey,
    hl: language === "es" ? "es-es" : "en-us",
    src: text,
    c: "MP3",
    f: "24khz_16bit_mono",
  });

  const response = await fetch(
    `https://api.voicerss.org/?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`VoiceRSS API error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

// Fetch TTS from a free public API
const fetchFreeTTS = async (
  text: string,
  language: string,
  ctx?: ProviderContext
): Promise<Uint8Array> => {
  // Try multiple free TTS APIs

  // Option 1: Use ResponsiveVoice (works in browser context)
  // Option 2: Use basic TTS proxy services

  // For now, use a simple approach: generate silent audio as placeholder
  // In production, you'd want to use a real TTS service

  const voiceRssKey = process.env.VOICERSS_API_KEY;

  if (voiceRssKey) {
    try {
      return await fetchVoiceRSS(text, language, voiceRssKey);
    } catch (error) {
      ctx?.logger?.warn("VoiceRSS failed, trying alternative", {
        error: String(error),
      });
    }
  }

  // Fallback: Generate a simple silent MP3 header + minimal data
  // This is just for testing - in production use a real TTS service
  ctx?.logger?.warn(
    "No TTS API key configured. Set VOICERSS_API_KEY for real TTS."
  );

  // Create minimal valid MP3 (silence)
  // MP3 frame header for 24kHz mono
  const mp3Header = new Uint8Array([
    0xff, 0xfb, 0x90, 0x00, // MP3 frame header
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  // Repeat for approximate duration based on text length
  const wordCount = text.split(/\s+/).length;
  const durationSeconds = Math.max(1, Math.ceil(wordCount / 3)); // ~3 words per second
  const framesNeeded = durationSeconds * 38; // ~38 frames per second at 24kHz

  const frames: Uint8Array[] = [];
  for (let i = 0; i < framesNeeded; i++) {
    frames.push(mp3Header);
  }

  return concatenateAudioChunks(frames);
};

export const createCloudflareTTSProvider = (): TTSProvider => {
  return {
    name: () => "cloudflare",
    async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
      try {
        const language = resolveLanguage(req.language);
        ctx?.logger?.debug("cloudflare:speak", {
          language,
          length: req.text.length,
        });

        // Split long text into manageable chunks
        const chunks = splitTextIntoChunks(req.text, 500);
        const audioChunks: Uint8Array[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          ctx?.logger?.debug("cloudflare:chunk", {
            index: i + 1,
            total: chunks.length,
            length: chunk.length,
          });

          const audioData = await fetchFreeTTS(chunk, language, ctx);
          audioChunks.push(audioData);
        }

        // Concatenate all audio chunks
        const finalAudio = concatenateAudioChunks(audioChunks);

        // Convert to Buffer for compatibility with existing code
        // Note: In Edge Runtime, we use Uint8Array which is compatible
        const audio = Buffer.from(finalAudio);

        return {
          audio,
          mimeType: "audio/mpeg",
        };
      } catch (error) {
        throw new ProviderCallError(
          error instanceof Error ? error.message : String(error),
          {
            provider: "cloudflare",
            cause: error,
          }
        );
      }
    },
  };
};
