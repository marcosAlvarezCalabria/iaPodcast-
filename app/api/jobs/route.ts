import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createJobId } from "@/src/lib/utils/ids";
import { validateJobInput } from "@/src/lib/utils/validation";
import { checkRateLimit } from "@/src/lib/utils/rateLimit";
import { cleanupJobs, initJob } from "@/src/lib/jobs/storage";
import type { JobMetadata } from "@/src/lib/jobs/types";

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

    // Beta Limit Check (Cookie based)
    const cookieStore = await cookies();
    const usageCookie = cookieStore.get("podcast_usage");
    const currentUsage = usageCookie ? parseInt(usageCookie.value) : 0;
    const LIMIT = 4;

    if (currentUsage >= LIMIT) {
      return NextResponse.json(
        { error: "Free beta limit reached", code: "LIMIT_EXCEEDED" },
        { status: 403 }
      );
    }

    // Increment usage
    cookieStore.set("podcast_usage", (currentUsage + 1).toString(), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

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

    // Auto-cleanup old jobs in background (fire and forget)
    // Deletes jobs older than 24h and incomplete jobs older than 30min
    // Excludes the current job to prevent any race conditions
    cleanupJobs({
      maxAgeHours: 24,
      deleteIncomplete: true,
      incompleteThresholdMinutes: 30,
      excludeJobIds: [jobId],
    }).catch((err) => console.error("Auto-cleanup failed:", err));

    // Return immediately - the job will be triggered by the SSE endpoint
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
};
