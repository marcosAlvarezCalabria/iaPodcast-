import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import Groq from "groq-sdk";

export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const language = formData.get("language") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("Missing GROQ_API_KEY");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        // Map frontend language codes to Whisper supported codes if necessary
        // 'es' -> 'es', 'en' -> 'en', 'fr' -> 'fr'. Whisper uses ISO-639-1.
        // Default to auto-detect if not provided.

        // Note: Groq Whisper API supports 'model', 'file', 'language', 'response_format'
        const transcription = await groq.audio.transcriptions.create({
            file: file,
            model: "whisper-large-v3-turbo",
            response_format: "json",
            language: language || undefined,
            temperature: 0.0,
        });

        const text = transcription.text?.trim() || "";

        // Common Whisper hallucinations / silence artifacts
        // Long phrases we can safely check with 'includes'
        const PHRASE_HALLUCINATIONS = [
            "Subtitle by Amara.org",
            "Subtitles by",
            "Amara.org",
            "Thanks for watching",
            "Thank you",
            "Gracias",
            "Suscríbete",
            "MBC"
        ];

        // Short phrases that must match exactly (case-insensitive) to be filtered
        const EXACT_HALLUCINATIONS = [
            "you",
            "bye",
            ".",
            ".."
        ];

        const lowerText = text.toLowerCase();

        const isHallucination =
            PHRASE_HALLUCINATIONS.some(h => lowerText.includes(h.toLowerCase())) ||
            EXACT_HALLUCINATIONS.includes(lowerText);

        if (isHallucination || text.length === 0) {
            return NextResponse.json({ text: "" });
        }

        return NextResponse.json({ text });
    } catch (error) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Transcription failed" },
            { status: 500 }
        );
    }
}
