import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readJobState } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: NextRequest,
  { params }: { params: { jobId: string } },
) => {
  const { jobId } = params;
  try {
    const state = await readJobState(jobId);
    return NextResponse.json({
      status: state.status,
      step: state.step,
      percent: state.percent,
      error: state.error,
      outputs: state.outputs
        ? {
            script: `/api/jobs/${jobId}/script`,
            chapters: `/api/jobs/${jobId}/chapters`,
            audio: `/api/jobs/${jobId}/audio`,
          }
        : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
};
