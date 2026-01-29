import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { getJobPath, readJobState } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  try {
    await readJobState(jobId);

    // Try MP3 first (edge-tts), then WAV (mock)
    let audioPath = getJobPath(jobId, "audio.mp3");
    let mimeType = "audio/mpeg";
    let extension = "mp3";

    try {
      await stat(audioPath);
    } catch {
      // Fallback to WAV
      audioPath = getJobPath(jobId, "audio.wav");
      mimeType = "audio/wav";
      extension = "wav";
    }

    const fileStat = await stat(audioPath);
    const stream = createReadStream(audioPath);
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `inline; filename=podcast-${jobId}.${extension}`,
      },
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
};
