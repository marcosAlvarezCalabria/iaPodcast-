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
    const audioPath = getJobPath(jobId, "audio.wav");
    const fileStat = await stat(audioPath);
    const stream = createReadStream(audioPath);
    return new Response(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `inline; filename=podcast-${jobId}.wav`,
      },
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
};
