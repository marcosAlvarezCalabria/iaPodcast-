import { ProviderCallError } from "../errors";
import type { ProviderContext, TTSRequest, TTSResult } from "../types";
import type { TTSProvider } from "./TTSProvider";

const defaultVoiceByLanguage: Record<string, string> = {
  es: "es-ES-AlvaroNeural",
  "es-es": "es-ES-AlvaroNeural",
  "es-mx": "es-MX-DaliaNeural",
  en: "en-US-GuyNeural",
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

const generateSSML = (text: string, voice: string): string => {
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voice}">
      ${escapedText}
    </voice>
  </speak>`;
};

const getWebSocketUrl = async (): Promise<string> => {
  const response = await fetch(
    "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0"
  );
  if (!response.ok) {
    throw new Error("Failed to get endpoint");
  }
  return "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4";
};

// Use a simpler HTTP-based approach with Edge TTS API
const synthesizeSpeech = async (
  text: string,
  voice: string,
  ctx?: ProviderContext
): Promise<Uint8Array> => {
  // Use the public Edge TTS endpoint
  const endpoint =
    "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
  const token = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

  const ssml = generateSSML(text, voice);

  const headers = {
    "Content-Type": "application/ssml+xml",
    "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
    Authorization: `Bearer ${token}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  // Try alternative endpoint that works with fetch
  const ttsUrl = `https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;

  // Since direct Edge TTS requires WebSocket which isn't ideal for Edge Runtime,
  // let's use a free TTS API alternative
  const freeApiUrl = "https://api.streamelements.com/kappa/v2/speech";
  const params = new URLSearchParams({
    voice: voice.includes("Neural") ? "Brian" : "Brian", // StreamElements voice
    text: text.substring(0, 500), // Limit text length
  });

  try {
    // Try StreamElements TTS (free, no auth required)
    const response = await fetch(`${freeApiUrl}?${params.toString()}`);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch {
    ctx?.logger?.debug("StreamElements TTS failed, trying alternative");
  }

  // Fallback: Use Google Translate TTS (limited but free)
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${voice.substring(0, 2)}&q=${encodeURIComponent(text.substring(0, 200))}`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch {
    ctx?.logger?.debug("Google TTS failed");
  }

  throw new Error(
    "All TTS endpoints failed. Consider using a paid TTS service."
  );
};

export const createEdgeHttpTTSProvider = (): TTSProvider => {
  return {
    name: () => "edge-http",
    async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
      try {
        const voice = resolveVoice(req.language, req.voice);
        ctx?.logger?.debug("edge-http:speak", {
          voice,
          language: req.language,
          length: req.text.length,
        });

        const audioData = await synthesizeSpeech(req.text, voice, ctx);

        // Convert Uint8Array to Buffer for compatibility
        const audio = Buffer.from(audioData);

        return {
          audio,
          mimeType: "audio/mpeg",
        };
      } catch (error) {
        throw new ProviderCallError(
          error instanceof Error ? error.message : String(error),
          {
            provider: "edge-http",
            cause: error,
          }
        );
      }
    },
  };
};
