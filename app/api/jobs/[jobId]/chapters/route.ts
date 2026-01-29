import { promises as fs } from "fs";
import { getJobPath, readJobState } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: Request,
  { params }: { params: { jobId: string } },
) => {
  const { jobId } = params;
  try {
    await readJobState(jobId);
    const raw = await fs.readFile(getJobPath(jobId, "chapters.json"), "utf-8");
    return new Response(raw, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
};
