import { createClient } from "@supabase/supabase-js";
import type { JobMetadata, JobState, JobStatus, JobLog, JobOutputs } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    console.warn("Missing or invalid NEXT_PUBLIC_SUPABASE_URL, using placeholder for build/dev safety.");
    // Return a dummy client or throw helpful error at runtime
    // For build safety, we return a client connected to a dummy URL if validation fails, 
    // but this ensures 'createClient' doesn't crash module scope.
    return createClient("https://placeholder.supabase.co", "placeholder", { auth: { persistSession: false } });
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
};

const BUCKET = "PodcastApp";

// Helper to upload JSON to Supabase
export const writeJSON = async <T>(path: string, data: T): Promise<void> => {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, JSON.stringify(data, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) throw new Error(`Supabase Write Error (${path}): ${error.message}`);
};

// Helper to read JSON from Supabase
const readJSON = async <T>(path: string): Promise<T> => {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path);

  if (error) throw new Error(`Supabase Read Error (${path}): ${error.message}`);

  const text = await data.text();
  return JSON.parse(text) as T;
};

// Initialize a new job
export const initJob = async (jobId: string, metadata: JobMetadata): Promise<JobState> => {
  const now = new Date().toISOString();
  const state: JobState = {
    jobId,
    status: "QUEUED",
    step: "queued",
    percent: 0,
    message: "Job queued",
    logs: [
      {
        step: "queued",
        percent: 0,
        message: "Job queued",
        ts: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await writeJSON(`${jobId}/metadata.json`, metadata);
  await writeJSON(`${jobId}/state.json`, state);
  return state;
};

// Read job state
export const readJobState = async (jobId: string): Promise<JobState> => {
  return readJSON<JobState>(`${jobId}/state.json`);
};

// Read job metadata
export const readJobMetadata = async (jobId: string): Promise<JobMetadata> => {
  return readJSON<JobMetadata>(`${jobId}/metadata.json`);
};

// Update job state
export const updateJobState = async (
  jobId: string,
  patch: Partial<JobState>,
  log?: JobLog,
): Promise<JobState> => {
  const current = await readJobState(jobId);
  const logs = log ? [...current.logs, log] : current.logs;
  const updatedAt = log?.ts ?? new Date().toISOString();
  const next: JobState = {
    ...current,
    ...patch,
    logs,
    updatedAt,
  };
  await writeJSON(`${jobId}/state.json`, next);
  return next;
};

export const setJobStatus = async (
  jobId: string,
  status: JobStatus,
  step: string,
  percent: number,
  message: string,
  error?: string,
): Promise<JobState> => {
  const ts = new Date().toISOString();
  const log: JobLog = { step, percent, message, ts };
  return updateJobState(jobId, { status, step, percent, message, error }, log);
};

export const setJobOutputs = async (
  jobId: string,
  outputs: JobOutputs,
): Promise<JobState> => {
  return updateJobState(jobId, { outputs });
};

// New Helper: Upload generic files (mp3, md)
export const saveJobFile = async (
  jobId: string,
  filename: string, // e.g. "podcast.mp3"
  content: string | Buffer | Blob,
  contentType: string,
): Promise<string> => {
  const path = `${jobId}/${filename}`;
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, content, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase Upload Error (${filename}): ${error.message}`);

  // Return public URL
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Helper: Get public URL for a file
export const getJobFileUrl = (jobId: string, filename: string): string => {
  const path = `${jobId}/${filename}`;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// List all job folders in the bucket
export const listAllJobs = async (): Promise<string[]> => {
  const { data, error } = await getSupabase().storage.from(BUCKET).list("", {
    limit: 1000,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) throw new Error(`Supabase List Error: ${error.message}`);

  // Filter to only folders (job IDs)
  return data?.filter((item) => item.id === null).map((item) => item.name) ?? [];
};

// Delete all files in a job folder
export const deleteJob = async (jobId: string): Promise<void> => {
  // First, list all files in the job folder
  const { data: files, error: listError } = await getSupabase().storage
    .from(BUCKET)
    .list(jobId, { limit: 100 });

  if (listError) throw new Error(`Supabase List Error (${jobId}): ${listError.message}`);

  if (!files || files.length === 0) return;

  // Delete all files in the folder
  const filePaths = files.map((file) => `${jobId}/${file.name}`);

  // Also check for sections subfolder
  const { data: sections } = await getSupabase().storage
    .from(BUCKET)
    .list(`${jobId}/sections`, { limit: 100 });

  if (sections && sections.length > 0) {
    filePaths.push(...sections.map((file) => `${jobId}/sections/${file.name}`));
  }

  const { error: deleteError } = await getSupabase().storage
    .from(BUCKET)
    .remove(filePaths);

  if (deleteError) throw new Error(`Supabase Delete Error (${jobId}): ${deleteError.message}`);
};

// Cleanup old or incomplete jobs
export type CleanupResult = {
  deleted: string[];
  errors: Array<{ jobId: string; error: string }>;
};

export const cleanupJobs = async (options: {
  maxAgeHours?: number; // Delete jobs older than this
  deleteIncomplete?: boolean; // Delete QUEUED/RUNNING jobs older than threshold
  incompleteThresholdMinutes?: number; // Consider incomplete if older than this
  excludeJobIds?: string[]; // Never delete these jobs
}): Promise<CleanupResult> => {
  const {
    maxAgeHours = 24,
    deleteIncomplete = true,
    incompleteThresholdMinutes = 30,
    excludeJobIds = [],
  } = options;

  const result: CleanupResult = { deleted: [], errors: [] };
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const incompleteThresholdMs = incompleteThresholdMinutes * 60 * 1000;

  try {
    const jobIds = await listAllJobs();

    for (const jobId of jobIds) {
      // Skip excluded jobs (e.g., the job that triggered this cleanup)
      if (excludeJobIds.includes(jobId)) continue;

      try {
        const state = await readJobState(jobId);
        const createdAt = new Date(state.createdAt).getTime();
        const age = now - createdAt;

        let shouldDelete = false;

        // Delete if older than maxAge
        if (age > maxAgeMs) {
          shouldDelete = true;
        }

        // Delete incomplete jobs older than threshold
        if (
          deleteIncomplete &&
          (state.status === "QUEUED" || state.status === "RUNNING") &&
          age > incompleteThresholdMs
        ) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          await deleteJob(jobId);
          result.deleted.push(jobId);
        }
      } catch (err) {
        result.errors.push({
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    result.errors.push({
      jobId: "list",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
};
