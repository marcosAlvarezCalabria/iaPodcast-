import { NextResponse } from "next/server";
import { createGoogleTTSProvider } from "@/src/lib/providers/tts/google";

export async function POST(request: Request) {
    try {
        const { voiceId } = await request.json();

        if (!voiceId) {
            return NextResponse.json({ error: "Missing voiceId" }, { status: 400 });
        }

        // Determine simplified text based on language/voice
        const isSpanish = voiceId.startsWith("es-");
        const isFrench = voiceId.startsWith("fr-");
        const text = isSpanish
            ? "Hola, esta es mi voz."
            : isFrench
                ? "Bonjour, voici ma voix."
                : "Hello, this is my voice.";

        // Initialize provider
        const tts = createGoogleTTSProvider();

        // Generate audio
        // Note: 'language' context isn't strictly needed by the provider if we pass the specific 'voice' ID 
        // because the provider's logic handles it, but we'll pass the code just in case.
        const language = voiceId.split("-").slice(0, 2).join("-");

        const result = await tts.speak({
            text,
            language, // e.g. "es-ES"
            voice: voiceId, // e.g. "es-ES-Neural2-B"
            speakingRate: 1.0,
        });

        // Return audio
        return new NextResponse(result.audio as any, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": result.audio.length.toString(),
            },
        });

    } catch (error) {
        console.error("Preview error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Preview failed" },
            { status: 500 }
        );
    }
}
