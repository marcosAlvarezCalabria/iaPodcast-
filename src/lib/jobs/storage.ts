import { promises as fs } from "fs";
import path from "path";
import type { JobMetadata, JobState, JobStatus, JobLog, JobOutputs } from "./types";

const resolveOutputRoot = (): string =>
  process.env.OUTPUT_DIR
    ? path.resolve(process.env.OUTPUT_DIR)
    : path.join(process.cwd(), "outputs");

export const getOutputRoot = (): string => resolveOutputRoot();

export const getJobDir = (jobId: string): string =>
  path.join(getOutputRoot(), jobId);

export const getJobPath = (jobId: string, filename: string): string =>
  path.join(getJobDir(jobId), filename);

export const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

export const ensureOutputRoot = async (): Promise<void> => {
  await ensureDir(getOutputRoot());
};

export const writeJSON = async <T>(filePath: string, data: T): Promise<void> => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

export const readJSON = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

export const initJob = async (jobId: string, metadata: JobMetadata): Promise<JobState> => {
  await ensureOutputRoot();
  const jobDir = getJobDir(jobId);
  await ensureDir(jobDir);

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

  await writeJSON(getJobPath(jobId, "metadata.json"), metadata);
  await writeJSON(getJobPath(jobId, "state.json"), state);
  return state;
};

export const readJobState = async (jobId: string): Promise<JobState> => {
  return readJSON<JobState>(getJobPath(jobId, "state.json"));
};

export const readJobMetadata = async (jobId: string): Promise<JobMetadata> => {
  return readJSON<JobMetadata>(getJobPath(jobId, "metadata.json"));
};

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
  await writeJSON(getJobPath(jobId, "state.json"), next);
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
