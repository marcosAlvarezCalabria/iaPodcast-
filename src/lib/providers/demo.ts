import { getLLMProvider, getTTSProvider } from "./registry";
import type { Logger, ProviderContext } from "./types";
import { ContentType, PodcastFormat, Tone } from "./types";

const consoleLogger: Logger = {
  info: (message, meta) => console.info(message, meta ?? {}),
  warn: (message, meta) => console.warn(message, meta ?? {}),
  error: (message, meta) => console.error(message, meta ?? {}),
  debug: (message, meta) => console.debug(message, meta ?? {}),
};

export const runDemo = async (): Promise<void> => {
  const llm = getLLMProvider();
  const tts = getTTSProvider();

  const ctx: ProviderContext = {
    requestId: `demo-${Date.now()}`,
    logger: consoleLogger,
    onUsage: (usage) => consoleLogger.info("usage", usage),
  };

  consoleLogger.info("providers", {
    llm: llm.name(),
    tts: tts.name(),
  });

  const outlineResult = await llm.generateOutline(
    {
      topic: "IA en educación",
      language: "es",
      tone: Tone.Informative,
      contentType: ContentType.Explanation,
      durationMinutes: 12,
      targetAudience: "docentes y estudiantes",
      format: PodcastFormat.SoloHost,
    },
    ctx,
  );

  consoleLogger.info("outline", outlineResult.data);

  const scriptResult = await llm.generateScript(
    {
      outline: outlineResult.data,
      topic: "IA en educación",
      language: "es",
      tone: Tone.Informative,
      contentType: ContentType.Explanation,
      durationMinutes: 12,
      targetAudience: "docentes y estudiantes",
      format: PodcastFormat.SoloHost,
    },
    ctx,
  );

  consoleLogger.info("script", { markdown: scriptResult.data.markdown });

  const intro = scriptResult.data.markdown.split("\n").slice(0, 4).join(" ");
  const audioResult = await tts.speak(
    {
      text: intro,
      language: "es",
      format: "mp3",
    },
    ctx,
  );

  consoleLogger.info("audio", {
    bytes: audioResult.audio.length,
    mimeType: audioResult.mimeType,
    durationSec: audioResult.durationSec,
  });
};

if (process.env.RUN_PROVIDERS_DEMO === "true") {
  runDemo().catch((error) => {
    console.error("demo failed", error);
    process.exitCode = 1;
  });
}
