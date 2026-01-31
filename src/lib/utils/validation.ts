import { z } from "zod";
import { ContentType, PodcastFormat, Tone } from "../providers/types";

// Schema Definition
export const JobInputSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required"),
  durationMinutes: z.coerce
    .number()
    .min(0.5, "Duration must be at least 0.5 minutes")
    .max(10, "Duration must be at most 10 minutes")
    .default(1),
  language: z.enum(["en", "es", "fr"]).default("en"),
  tone: z.nativeEnum(Tone).default(Tone.Informative),
  contentType: z.nativeEnum(ContentType).default(ContentType.Reflection),
  targetAudience: z.string().trim().default("general"),
  format: z.nativeEnum(PodcastFormat).default(PodcastFormat.SoloHost),
});

// Type inference
export type JobInput = z.infer<typeof JobInputSchema>;

export const validateJobInput = (payload: unknown) => {
  const result = JobInputSchema.safeParse(payload);

  if (!result.success) {
    const formattedErrors: Record<string, string[]> = {};

    result.error.issues.forEach((issue) => {
      const path = issue.path[0] as string;
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      formattedErrors[path].push(issue.message);
    });

    // Provide a root error if we failed on a non-object or unparseable inputs at top level
    if (Object.keys(formattedErrors).length === 0) {
      formattedErrors["root"] = ["Invalid input format"];
    }

    return { success: false, errors: formattedErrors } as const;
  }

  return { success: true, data: result.data } as const;
};
