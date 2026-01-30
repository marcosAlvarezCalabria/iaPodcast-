import { createClient } from "@supabase/supabase-js";
import type { JobMetadata, JobState, JobStatus, JobLog, JobOutputs } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Initialize Supabase Client with Service Role for backend rights
// Note: We use placeholders to prevent build-time crashes if env vars are missing during static generation.
// The actual API calls will fail at runtime if keys are invalid, which is expected behavior.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const BUCKET = "PodcastApp";

// Helper to upload JSON to Supabase
export const writeJSON = async <T>(path: string, data: T): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, JSON.stringify(data, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) throw new Error(`Supabase Write Error (${path}): ${error.message}`);
};

// Helper to read JSON from Supabase
const readJSON = async <T>(path: string): Promise<T> => {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);

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
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, content, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase Upload Error (${filename}): ${error.message}`);

  // Return public URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Helper: Get public URL for a file
export const getJobFileUrl = (jobId: string, filename: string): string => {
  const path = `${jobId}/${filename}`;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
