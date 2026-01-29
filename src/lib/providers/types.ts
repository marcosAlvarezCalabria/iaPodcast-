export enum Tone {
  Friendly = "friendly",
  Professional = "professional",
  Energetic = "energetic",
  Calm = "calm",
}

export enum PodcastFormat {
  Interview = "interview",
  Narrative = "narrative",
  Roundtable = "roundtable",
}

export type PodcastOutline = {
  title: string;
  sections: Array<{
    heading: string;
    bullets: string[];
  }>;
};

export type OutlineRequest = {
  topic: string;
  language: string;
  tone: Tone;
  durationMinutes: number;
  targetAudience: string;
  format: PodcastFormat;
};

export type ScriptRequest = {
  outline: PodcastOutline;
  topic: string;
  language: string;
  tone: Tone;
  durationMinutes: number;
  targetAudience: string;
  format: PodcastFormat;
};

export type TTSRequest = {
  text: string;
  language: string;
  voice?: string;
  format?: "wav" | "mp3";
  speakingRate?: number;
};

export type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  audioSecondsIn?: number;
  audioSecondsOut?: number;
  provider?: string;
  model?: string;
};

export type LLMResult<T> = {
  data: T;
  raw?: unknown;
  usage?: Usage;
};

export type TTSResult = {
  audio: Buffer;
  mimeType: string;
  durationSec?: number;
  usage?: Usage;
};

export type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
};

export type ProviderContext = {
  requestId?: string;
  signal?: AbortSignal;
  onUsage?: (usage: Usage) => void;
  logger?: Logger;
};
