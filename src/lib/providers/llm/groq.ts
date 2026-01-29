import { ProviderCallError, ProviderConfigError } from "../errors";
import type {
  LLMResult,
  OutlineRequest,
  PodcastOutline,
  ProviderContext,
  ScriptRequest,
} from "../types";
import type { LLMProvider } from "./LLMProvider";

const getApiKey = (): string => {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new ProviderConfigError(
      "Missing GROQ_API_KEY environment variable",
      { provider: "groq" }
    );
  }
  return key;
};

export const createGroqProvider = (): LLMProvider => {
  return {
    name: () => "groq",

    async generateOutline(
      req: OutlineRequest,
      ctx?: ProviderContext
    ): Promise<LLMResult<PodcastOutline>> {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: getApiKey() });

      ctx?.logger?.debug("groq:generateOutline", { topic: req.topic });

      const prompt = `Eres un productor de podcasts profesional. Genera un outline estructurado para un episodio de podcast.

TEMA: ${req.topic}
DURACIÓN: ${req.durationMinutes} minutos
IDIOMA: ${req.language}
TONO: ${req.tone}
AUDIENCIA: ${req.targetAudience}
FORMATO: ${req.format}

Responde SOLO con JSON válido (sin markdown, sin \`\`\`):
{
  "title": "Título atractivo del episodio",
  "sections": [
    {
      "heading": "Nombre de la sección",
      "bullets": ["Punto 1", "Punto 2", "Punto 3"]
    }
  ]
}

El outline debe tener:
- Intro con hook (30 segundos)
- 2-4 secciones principales
- Cierre con call-to-action

Genera el outline ahora:`;

      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        });

        const text = completion.choices[0]?.message?.content || "";

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found in response");
        }

        const outline = JSON.parse(jsonMatch[0]) as PodcastOutline;

        return {
          data: outline,
          raw: text,
          usage: {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
          },
        };
      } catch (error) {
        throw new ProviderCallError(
          error instanceof Error ? error.message : String(error),
          { provider: "groq", cause: error }
        );
      }
    },

    async generateScript(
      req: ScriptRequest,
      ctx?: ProviderContext
    ): Promise<LLMResult<{ markdown: string }>> {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: getApiKey() });

      ctx?.logger?.debug("groq:generateScript", { title: req.outline.title });

      const outlineText = req.outline.sections
        .map((s) => `## ${s.heading}\n${s.bullets.map((b) => `- ${b}`).join("\n")}`)
        .join("\n\n");

      const prompt = `Eres un Filósofo moderno. Escribe una "Reflexión Diaria" de EXACTAMENTE 30 SEGUNDOS.

TÍTULO: ${req.outline.title}
DURACIÓN: 30 segundos (Máximo 80-100 palabras)
IDIOMA: ${req.language}
TONO: ${req.tone}
AUDIENCIA: ${req.targetAudience}

OUTLINE:
${outlineText}

INSTRUCCIONES DE FORMATO:
1. SOLO UN PÁRRAFO continuo.
2. Sin "Hola" ni "Adiós". Entra directo a la idea profunda.
3. Estilo poético pero comprensible.
4. Una sola idea poderosa.
5. NO uses encabezados ni secciones. Solo el texto puro.

EJEMPLO:
"A veces pensamos que el tiempo se nos escapa, pero somos nosotros quienes corremos sin sentido. Detente un segundo. Respira. La vida no es la meta, es el camino bajo tus pies ahora mismo."

TU GUION (Escribe solo el texto de la reflexión):`;

      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 4000,
        });

        const markdown = completion.choices[0]?.message?.content || "";

        return {
          data: { markdown },
          raw: markdown,
          usage: {
            inputTokens: completion.usage?.prompt_tokens ?? 0,
            outputTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
          },
        };
      } catch (error) {
        throw new ProviderCallError(
          error instanceof Error ? error.message : String(error),
          { provider: "groq", cause: error }
        );
      }
    },
  };
};
