import { NextRequest, NextResponse } from "next/server";
import { getJobFileUrl } from "@/src/lib/jobs/storage";

export const runtime = "edge";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  const url = getJobFileUrl(jobId, "audio.mp3");
  // Redirect to Supabase Storage
  return NextResponse.redirect(url);
};
