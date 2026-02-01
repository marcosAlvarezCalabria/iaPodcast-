import { ProviderCallError, ProviderConfigError } from "../errors";
import type { ProviderContext, TTSRequest, TTSResult } from "../types";
import type { TTSProvider } from "./TTSProvider";

/**
 * Google Cloud Text-to-Speech Provider
 * 
 * Uses the REST API for compatibility with Edge Runtime.
 * Requires GOOGLE_TTS_API_KEY environment variable.
 */

const DEFAULT_VOICE_ES = "es-ES-Neural2-B"; // Male Neural2
const DEFAULT_VOICE_EN = "en-US-Neural2-D"; // Male Neural2

const languageToVoice: Record<string, string> = {
    // Spanish
    es: DEFAULT_VOICE_ES,
    "es-es": "es-ES-Neural2-A", // Female
    "es-mx": "es-US-Neural2-A", // US Spanish often better for general LATAM if MX specific not available or preferred
    // English
    en: DEFAULT_VOICE_EN,
    "en-us": DEFAULT_VOICE_EN,
    "en-gb": "en-GB-Neural2-B",
};

const resolveVoice = (language: string, requestedVoice?: string): { languageCode: string; name: string } => {
    if (requestedVoice) {
        // If user specifies a full Google voice name (e.g. "es-ES-Neural2-A")
        const parts = requestedVoice.split("-");
        const languageCode = parts.slice(0, 2).join("-");
        return { languageCode, name: requestedVoice };
    }

    const normalized = language.trim().toLowerCase();
    const voiceName = languageToVoice[normalized] || languageToVoice[normalized.substring(0, 2)] || DEFAULT_VOICE_EN;

    // Extract language code from the voice name (e.g. "es-ES" from "es-ES-Neural2-A")
    const parts = voiceName.split("-");
    const languageCode = parts.slice(0, 2).join("-");

    return { languageCode, name: voiceName };
};

export const createGoogleTTSProvider = (): TTSProvider => {
    return {
        name: () => "google",
        async speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult> {
            const apiKey = process.env.GOOGLE_TTS_API_KEY;
            if (!apiKey) {
                throw new ProviderConfigError("GOOGLE_TTS_API_KEY is not set");
            }

            try {
                const { languageCode, name } = resolveVoice(req.language, req.voice);

                ctx?.logger?.debug("google:speak", {
                    textLength: req.text.length,
                    language: req.language,
                    voice: name,
                });

                ctx?.onUsage?.({
                    provider: "google",
                    model: "neural2",
                    inputCharacters: req.text.length,
                });

                const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        input: { text: req.text },
                        voice: { languageCode, name },
                        audioConfig: {
                            audioEncoding: "MP3",
                            speakingRate: req.speakingRate || 1.0,
                        },
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Google TTS API error ${response.status}: ${errorText}`);
                }

                const data = await response.json();

                if (!data.audioContent) {
                    throw new Error("Google TTS response missing audioContent");
                }

                // Google returns base64 encoded audio
                const audioBuffer = Buffer.from(data.audioContent, "base64");

                ctx?.logger?.debug("google:success", { audioSize: audioBuffer.length });

                return {
                    audio: audioBuffer,
                    mimeType: "audio/mpeg",
                };

            } catch (error) {
                throw new ProviderCallError(
                    error instanceof Error ? error.message : String(error),
                    {
                        provider: "google",
                        cause: error,
                    }
                );
            }
        },
    };
};
