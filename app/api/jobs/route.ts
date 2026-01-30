import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createJobId } from "@/src/lib/utils/ids";
import { validateJobInput } from "@/src/lib/utils/validation";
import { checkRateLimit } from "@/src/lib/utils/rateLimit";
import { initJob } from "@/src/lib/jobs/storage";
import type { JobMetadata } from "@/src/lib/jobs/types";
import { runJob } from "@/src/lib/jobs/runner";

export const runtime = "edge";

export const POST = async (request: NextRequest) => {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil(rate.retryAfter / 1000).toString() },
        },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = validateJobInput(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.errors },
        { status: 400 },
      );
    }

    const jobId = createJobId();
    const metadata: JobMetadata = {
      jobId,
      input: parsed.data,
      createdAt: new Date().toISOString(),
    };

    await initJob(jobId, metadata);

    // Run the job synchronously and wait for it to complete
    // This ensures the job finishes before Cloudflare terminates the worker
    console.log(`[API] Starting job ${jobId}`);

    try {
      await runJob(jobId);
      console.log(`[API] Job ${jobId} completed successfully`);
    } catch (error) {
      console.error(`[API] Job ${jobId} failed:`, error);
      // Job failure is handled internally, continue to return jobId
    }

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
};
