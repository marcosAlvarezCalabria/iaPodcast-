import type {
  LLMResult,
  OutlineRequest,
  PodcastOutline,
  ProviderContext,
  ScriptRequest,
  Usage,
} from "../types";
import type { LLMProvider } from "./LLMProvider";

const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / 4));

const buildOutline = (req: OutlineRequest): PodcastOutline => {
  const topic = req.topic.trim() || "Tema desconocido";
  return {
    title: `${topic}: una conversación ${req.format}`,
    sections: [
      {
        heading: "Introducción",
        bullets: [
          `Presentación del tema: ${topic}.`,
          `Por qué importa para ${req.targetAudience}.`,
        ],
      },
      {
        heading: "Puntos clave",
        bullets: [
          `Idea principal sobre ${topic}.`,
          "Ejemplos prácticos y contexto.",
          "Consejos accionables para la audiencia.",
        ],
      },
      {
        heading: "Cierre",
        bullets: [
          "Resumen de aprendizajes.",
          "Invitación a la reflexión y próximos pasos.",
        ],
      },
    ],
  };
};

const buildScript = (outline: PodcastOutline, req: ScriptRequest): string => {
  const intro = `# ${outline.title}\n\n`;
  const sections = outline.sections
    .map((section) => {
      const bullets = section.bullets.map((bullet) => `- ${bullet}`).join("\n");
      return `## ${section.heading}\n${bullets}\n\n`;
    })
    .join("");
  return (
    `${intro}` +
    `**Idioma:** ${req.language}\n` +
    `**Tono:** ${req.tone}\n` +
    `**Duración:** ${req.durationMinutes} minutos\n\n` +
    sections
  ).trim();
};

export const createMockLLMProvider = (): LLMProvider => {
  return {
    name: () => "mock",
    async generateOutline(
      req: OutlineRequest,
      ctx?: ProviderContext,
    ): Promise<LLMResult<PodcastOutline>> {
      ctx?.logger?.debug("mock:generateOutline", { topic: req.topic });
      const outline = buildOutline(req);
      const usage: Usage = {
        inputTokens: estimateTokens(JSON.stringify(req)),
        outputTokens: estimateTokens(JSON.stringify(outline)),
        totalTokens: undefined,
        provider: "mock",
        model: "mock-llm",
      };
      usage.totalTokens =
        (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      ctx?.onUsage?.(usage);
      return { data: outline, usage };
    },
    async generateScript(
      req: ScriptRequest,
      ctx?: ProviderContext,
    ): Promise<LLMResult<{ markdown: string }>> {
      ctx?.logger?.debug("mock:generateScript", { title: req.outline.title });
      const markdown = buildScript(req.outline, req);
      const usage: Usage = {
        inputTokens: estimateTokens(JSON.stringify(req.outline)),
        outputTokens: estimateTokens(markdown),
        totalTokens: undefined,
        provider: "mock",
        model: "mock-llm",
      };
      usage.totalTokens =
        (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      ctx?.onUsage?.(usage);
      return { data: { markdown }, usage };
    },
  };
};
