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

        return NextResponse.json({ text: transcription.text });
    } catch (error) {
        console.error("Transcription error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Transcription failed" },
            { status: 500 }
        );
    }
}
