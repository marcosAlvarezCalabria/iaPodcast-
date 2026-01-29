import type { JobInput } from "../utils/validation";

export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "ERROR";

export type JobLog = {
  step: string;
  percent: number;
  message: string;
  ts: string;
};

export type JobOutputs = {
  script: string;
  chapters: string;
  audio: string;
  metadata: string;
};

export type JobState = {
  jobId: string;
  status: JobStatus;
  step: string;
  percent: number;
  message?: string;
  error?: string;
  logs: JobLog[];
  outputs?: JobOutputs;
  createdAt: string;
  updatedAt: string;
};

export type JobMetadata = {
  jobId: string;
  input: JobInput;
  createdAt: string;
  providers?: {
    llm?: string;
    tts?: string;
  };
  timings?: Record<string, string>;
  usage?: Record<string, unknown>[];
};
