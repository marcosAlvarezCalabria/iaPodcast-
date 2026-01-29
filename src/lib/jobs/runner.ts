import { promises as fs } from "fs";
import path from "path";
import { concatWavBuffers } from "../audio/mix";
import { getLLMProvider, getTTSProvider } from "../providers";
import type { ProviderContext, Usage } from "../providers/types";
import { estimateChapters, parseScriptSections } from "./chapters";
import {
  getJobPath,
  readJobMetadata,
  setJobOutputs,
  setJobStatus,
  updateJobState,
  writeJSON,
} from "./storage";
import type { JobMetadata } from "./types";

const buildLogger = (jobId: string) => ({
  info: (message: string, meta?: Record<string, unknown>) =>
    console.info(`[job:${jobId}] ${message}`, meta ?? {}),
  warn: (message: string, meta?: Record<string, unknown>) =>
    console.warn(`[job:${jobId}] ${message}`, meta ?? {}),
  error: (message: string, meta?: Record<string, unknown>) =>
    console.error(`[job:${jobId}] ${message}`, meta ?? {}),
  debug: (message: string, meta?: Record<string, unknown>) =>
    console.debug(`[job:${jobId}] ${message}`, meta ?? {}),
});

export const runJob = async (jobId: string): Promise<void> => {
  const metadata = await readJobMetadata(jobId);
  const logger = buildLogger(jobId);
  const usageRecords: Usage[] = [];

  const ctx: ProviderContext = {
    requestId: jobId,
    logger,
    onUsage: (usage) => {
      usageRecords.push(usage);
    },
  };

  const startedAt = new Date().toISOString();

  try {
    await setJobStatus(jobId, "RUNNING", "outline", 10, "Generating outline");

    const llm = getLLMProvider();
    const tts = getTTSProvider();

    const outlineResult = await llm.generateOutline(metadata.input, ctx);
    const outline = outlineResult.data;

    await setJobStatus(jobId, "RUNNING", "script", 30, "Drafting script");

    const scriptResult = await llm.generateScript({
      outline,
      ...metadata.input,
    }, ctx);

    const scriptMarkdown = scriptResult.data.markdown;
    await fs.writeFile(getJobPath(jobId, "script.md"), scriptMarkdown, "utf-8");

    const chapters = estimateChapters(scriptMarkdown, metadata.input);
    await writeJSON(getJobPath(jobId, "chapters.json"), chapters);

    await setJobStatus(jobId, "RUNNING", "tts", 60, "Synthesizing audio");

    const sections = parseScriptSections(scriptMarkdown);
    const audioBuffers: Buffer[] = [];
    const sectionDir = getJobPath(jobId, "sections");
    await fs.mkdir(sectionDir, { recursive: true });

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const result = await tts.speak(
        {
          text: section.content,
          language: metadata.input.language,
          format: "wav",
        },
        ctx,
      );
      audioBuffers.push(result.audio);
      const filename = `section_${String(index + 1).padStart(2, "0")}.wav`;
      await fs.writeFile(path.join(sectionDir, filename), result.audio);

      const percent = 60 + Math.round(((index + 1) / sections.length) * 20);
      await updateJobState(jobId, {
        step: "tts",
        percent,
        message: `Synthesized section ${index + 1} of ${sections.length}`,
      }, {
        step: "tts",
        percent,
        message: `Synthesized section ${index + 1} of ${sections.length}`,
        ts: new Date().toISOString(),
      });
    }

    await setJobStatus(jobId, "RUNNING", "mix", 85, "Mixing audio");

    const finalAudio = concatWavBuffers(audioBuffers);
    await fs.writeFile(getJobPath(jobId, "audio.wav"), finalAudio);

    const finishedAt = new Date().toISOString();

    metadata.providers = {
      llm: llm.name(),
      tts: tts.name(),
    };
    metadata.timings = { startedAt, finishedAt };
    metadata.usage = usageRecords;
    await writeJSON(getJobPath(jobId, "metadata.json"), metadata);

    await setJobOutputs(jobId, {
      script: "script.md",
      chapters: "chapters.json",
      audio: "audio.wav",
      metadata: "metadata.json",
    });

    await setJobStatus(jobId, "DONE", "finalize", 100, "Job complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Job failed", { error });
    await setJobStatus(jobId, "ERROR", "error", 100, message, message);
  }
};
