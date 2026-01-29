import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readJobState, readJobMetadata } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  try {
    const state = await readJobState(jobId);
    const metadata = await readJobMetadata(jobId);
    return NextResponse.json({
      status: state.status,
      step: state.step,
      percent: state.percent,
      error: state.error,
      topic: metadata.input.topic,
      outputs: state.outputs, // Return direct Supabase public URLs set by the runner
    });
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
};
