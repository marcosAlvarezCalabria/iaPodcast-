import { NextRequest, NextResponse } from "next/server";
import { getJobFileUrl } from "@/src/lib/jobs/storage";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;
  const url = getJobFileUrl(jobId, "script.md");
  return NextResponse.redirect(url);
};
