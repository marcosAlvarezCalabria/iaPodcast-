import { readJobState } from "@/src/lib/jobs/storage";
import { runJob } from "@/src/lib/jobs/runner";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const formatSse = (data: unknown) => {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
};

// Track running jobs to prevent double-execution
const runningJobs = new Set<string>();

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await params;

  let active = true;
  let jobStarted = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastLogCount = 0;
      const sendState = async () => {
        try {
          const state = await readJobState(jobId);

          // Start the job if it's queued and not already running
          if (state.status === "QUEUED" && !jobStarted && !runningJobs.has(jobId)) {
            jobStarted = true;
            runningJobs.add(jobId);
            console.log(`[SSE] Starting job ${jobId}`);

            // Run job in background (don't await)
            runJob(jobId)
              .catch((err) => console.error(`[SSE] Job ${jobId} failed:`, err))
              .finally(() => runningJobs.delete(jobId));
          }
          const logs = state.logs.slice(lastLogCount);
          if (logs.length > 0) {
            logs.forEach((log) =>
              controller.enqueue(formatSse({ ...log, status: state.status })),
            );
            lastLogCount = state.logs.length;
          } else {
            controller.enqueue(
              formatSse({
                status: state.status,
                step: state.step,
                percent: state.percent,
                message: state.message ?? state.status,
                ts: state.updatedAt,
              }),
            );
          }

          if (state.status === "DONE" || state.status === "ERROR") {
            controller.enqueue(
              formatSse({
                status: state.status,
                step: state.step,
                percent: state.percent,
                message: state.message ?? state.status,
                ts: state.updatedAt,
                done: true,
              }),
            );
            controller.close();
            return false;
          }
          return true;
        } catch (error) {
          controller.enqueue(
            formatSse({
              step: "error",
              percent: 100,
              message: "Job not found",
              ts: new Date().toISOString(),
            }),
          );
          controller.close();
          return false;
        }
      };

      controller.enqueue(encoder.encode("retry: 1000\n\n"));
      const tick = async () => {
        if (!active) {
          return;
        }
        const keepGoing = await sendState();
        if (keepGoing) {
          setTimeout(tick, 1000);
        }
      };
      tick();
    },
    cancel() {
      active = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
