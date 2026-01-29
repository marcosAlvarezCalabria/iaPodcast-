import type {
  LLMResult,
  OutlineRequest,
  PodcastOutline,
  ProviderContext,
  ScriptRequest,
  Usage,
} from "../types";
import type { LLMProvider } from "./LLMProvider";

const estimateTokens = (text: string): number =>
  Math.max(1, Math.ceil(text.length / 4));

const buildOutline = (req: OutlineRequest): PodcastOutline => {
  const topic = req.topic.trim() || "Tema desconocido";
  return {
    title: `${topic}: una conversación ${req.format}`,
    sections: [
      {
        heading: "Intro hook",
        bullets: [
          `Abrimos con un dato sorprendente sobre ${topic}.`,
          `Promesa de valor para ${req.targetAudience}.`,
        ],
      },
      {
        heading: "Contexto esencial",
        bullets: [
          `Definición clara de ${topic}.`,
          "Por qué es relevante hoy.",
          "Errores comunes a evitar.",
        ],
      },
      {
        heading: "Ideas clave",
        bullets: [
          `Estrategia principal relacionada con ${topic}.`,
          "Ejemplos y casos breves.",
          "Consejos prácticos para aplicar.",
        ],
      },
      {
        heading: "Cierre",
        bullets: [
          "Resumen de aprendizajes.",
          "Próximos pasos recomendados.",
        ],
      },
    ],
  };
};

const buildScript = (outline: PodcastOutline, req: ScriptRequest): string => {
  const intro = `# ${outline.title}\n\n`;
  const hook = `## Intro hook\n`;
  const hookBody =
    `Abrimos con una idea que capture la atención sobre ${req.topic}. ` +
    `En menos de un minuto, la audiencia entiende por qué este tema importa para ${req.targetAudience}.\n\n`;

  const sections = outline.sections
    .filter((section) => section.heading !== "Intro hook")
    .map((section) => {
      const bullets = section.bullets.map((bullet) => `- ${bullet}`).join("\n");
      return `## ${section.heading}\n${bullets}\n\n`;
    })
    .join("");

  const transitions = `### Transiciones\n` +
    `- Pasamos de la teoría a la práctica con un ejemplo.\n` +
    `- Ahora conectamos estos puntos con acciones concretas.\n\n`;

  const recap = `### Recap\n` +
    `- Repasamos las ideas más importantes.\n` +
    `- Destacamos el consejo principal para ${req.targetAudience}.\n\n`;

  const outro =
    `## Outro + CTA\n` +
    `Gracias por escuchar. Si este episodio te ayudó, comparte el podcast y suscríbete para más temas como ${req.topic}.\n`;

  return (
    `${intro}` +
    `**Idioma:** ${req.language}\n` +
    `**Tono:** ${req.tone}\n` +
    `**Duración:** ${req.durationMinutes} minutos\n\n` +
    hook +
    hookBody +
    sections +
    transitions +
    recap +
    outro
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
      usage.totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
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
      usage.totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
      ctx?.onUsage?.(usage);
      return { data: { markdown }, usage };
    },
  };
};
