import { concatAudioBuffers } from "../audio/mix";
import { getLLMProvider, getTTSProvider } from "../providers";
import type { ProviderContext, Usage } from "../providers/types";
import { estimateChapters, parseScriptSections } from "./chapters";
import {
  readJobMetadata,
  saveJobFile,
  setJobOutputs,
  setJobStatus,
  updateJobState,
  writeJSON,
  // readJobState, // ensure state is fresh (removed unused)
} from "./storage";
// import type { JobMetadata } from "./types"; (removed unused)

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

    const scriptResult = await llm.generateScript(
      {
        outline,
        ...metadata.input,
      },
      ctx,
    );

    const scriptMarkdown = scriptResult.data.markdown;
    // Upload Script
    const scriptUrl = await saveJobFile(jobId, "script.md", scriptMarkdown, "text/markdown");

    const chapters = estimateChapters(scriptMarkdown, metadata.input);
    // Upload Chapters (via internal JSON helper)
    // Note: chapters.json is handled by writeJSON in storage usually, but let's be explicit
    // Actually storage.ts writeJSON handles the upload correctly now.
    // We just need to make sure we use the public path logic if needed, but for internal state it's fine.
    // However, chapters.json is an output.
    // Let's use saveJobFile for outputs to get URLs if needed, or just writeJSON if it's data.
    // For now, writeJSON is fine as it uploads to Supabase.

    await setJobStatus(jobId, "RUNNING", "tts", 60, "Synthesizing audio");

    const sections = parseScriptSections(scriptMarkdown);
    const audioBuffers: Buffer[] = [];
    let audioFormat: "wav" | "mp3" | null = null;
    let audioExtension = "wav";

    // No need to create directories in Supabase (it's object storage)

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const result = await tts.speak(
        {
          text: section.content,
          language: metadata.input.language,
          format: "mp3",
        },
        ctx,
      );
      const resultFormat =
        result.mimeType === "audio/wav"
          ? "wav"
          : result.mimeType === "audio/mpeg" || result.mimeType === "audio/mp3"
            ? "mp3"
            : null;
      if (!resultFormat) {
        throw new Error(`Unsupported audio mime type: ${result.mimeType}`);
      }
      if (!audioFormat) {
        audioFormat = resultFormat;
        audioExtension = audioFormat === "mp3" ? "mp3" : "wav";
      } else if (audioFormat !== resultFormat) {
        throw new Error("Audio format mismatch between sections");
      }
      audioBuffers.push(result.audio);

      // Upload Section Audio (Optional, good for debugging)
      const filename = `sections/section_${String(index + 1).padStart(2, "0")}.${audioExtension}`;
      await saveJobFile(jobId, filename, result.audio, result.mimeType);

      const percent = 60 + Math.round(((index + 1) / sections.length) * 20);
      await updateJobState(
        jobId,
        {
          step: "tts",
          percent,
          message: `Synthesized section ${index + 1} of ${sections.length}`,
        },
        {
          step: "tts",
          percent,
          message: `Synthesized section ${index + 1} of ${sections.length}`,
          ts: new Date().toISOString(),
        },
      );
    }

    await setJobStatus(jobId, "RUNNING", "mix", 85, "Mixing audio");

    if (!audioFormat) {
      throw new Error("No audio generated");
    }
    const finalAudio = concatAudioBuffers(audioBuffers, audioFormat);
    const outputFilename = `audio.${audioExtension}`;

    // Upload Final Audio
    const audioUrl = await saveJobFile(
      jobId,
      outputFilename,
      finalAudio,
      audioFormat === "mp3" ? "audio/mpeg" : "audio/wav"
    );

    const finishedAt = new Date().toISOString();

    metadata.providers = {
      llm: llm.name(),
      tts: tts.name(),
    };
    metadata.timings = { startedAt, finishedAt };
    metadata.usage = usageRecords;

    // Save updated metadata
    // We use the internal writeJSON which now uploads to Supabase
    // To update metadata, we need to re-import writeJSON or use initJob logic? 
    // storage.ts exports readJobMetadata but not explicitly writeJobMetadata helper, 
    // but we can use generic writeJSON with the path.
    // wait, storage.ts defines `initJob` which writes metadata. 
    // Use generic writeJSON from storage.ts (need to export it or add helper)
    // Looking at imports, writeJSON IS exported.
    await writeJSON(`${jobId}/metadata.json`, metadata);
    await writeJSON(`${jobId}/chapters.json`, chapters);

    await setJobOutputs(jobId, {
      script: scriptUrl, // Use public URL or path? The frontend usually expects a relative path or URL.
      // storage.ts setJobOutputs updates state.outputs.
      // API currently returns paths like `/api/jobs/...`. 
      // If we switch to Supabase, we should probably return direct URLs or keep the API proxy.
      // Netlify Functions have 10s timeout, so proxying huge files is risky. 
      // Direct Supabase URLs are better.
      // Let's store the DIRECT public URLs in the state outputs.
      chapters: await saveJobFile(jobId, "chapters.json", JSON.stringify(chapters, null, 2), "application/json"),
      audio: audioUrl,
      metadata: await saveJobFile(jobId, "metadata.json", JSON.stringify(metadata, null, 2), "application/json"),
    });

    await setJobStatus(jobId, "DONE", "finalize", 100, "Job complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Job failed", { error });
    await setJobStatus(jobId, "ERROR", "error", 100, message, message);
  }
};
