import { PodcastFormat, Tone } from "../providers/types";

export type JobInput = {
  topic: string;
  durationMinutes: number;
  language: string;
  tone: Tone;
  targetAudience: string;
  format: PodcastFormat;
};

const toneValues = new Set(Object.values(Tone));
const formatValues = new Set(Object.values(PodcastFormat));

const isString = (value: unknown): value is string => typeof value === "string";

const parseNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const validateJobInput = (payload: unknown) => {
  const errors: Record<string, string[]> = {};
  if (!payload || typeof payload !== "object") {
    return { success: false, errors: { root: ["Invalid payload"] } } as const;
  }

  const data = payload as Record<string, unknown>;

  const topic = isString(data.topic) ? data.topic.trim() : "";
  if (!topic) {
    errors.topic = ["Topic is required"];
  }

  const durationMinutes = parseNumber(data.durationMinutes, 5);
  if (durationMinutes < 2 || durationMinutes > 20) {
    errors.durationMinutes = ["Duration must be between 2 and 20 minutes"];
  }

  const language = isString(data.language) && data.language.trim()
    ? data.language.trim()
    : "en";

  const toneRaw = isString(data.tone) ? data.tone : Tone.Informative;
  const tone = toneValues.has(toneRaw as Tone)
    ? (toneRaw as Tone)
    : Tone.Informative;

  const targetAudience = isString(data.targetAudience) && data.targetAudience.trim()
    ? data.targetAudience.trim()
    : "general";

  const formatRaw = isString(data.format) ? data.format : PodcastFormat.SoloHost;
  const format = formatValues.has(formatRaw as PodcastFormat)
    ? (formatRaw as PodcastFormat)
    : PodcastFormat.SoloHost;

  if (Object.keys(errors).length > 0) {
    return { success: false, errors } as const;
  }

  const validated: JobInput = {
    topic,
    durationMinutes,
    language,
    tone,
    targetAudience,
    format,
  };

  return { success: true, data: validated } as const;
};
