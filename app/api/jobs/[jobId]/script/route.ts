import { promises as fs } from "fs";
import { readJobState, getJobPath } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  try {
    await readJobState(jobId);
    const content = await fs.readFile(getJobPath(jobId, "script.md"), "utf-8");
    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
};
