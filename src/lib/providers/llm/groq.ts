import { ProviderCallError, ProviderConfigError } from "../errors";
import type {
  LLMResult,
  OutlineRequest,
  PodcastOutline,
  ProviderContext,
  ScriptRequest,
} from "../types";
import { ContentType } from "../types";
import type { LLMProvider } from "./LLMProvider";

const getContentTypePrompt = (contentType: ContentType) => {
  const prompts = {
    [ContentType.Reflection]: {
      role: "a modern Philosopher",
      type: "Philosophical Reflection",
      instructions: `1. ONLY ONE continuous paragraph.
2. No greetings or farewells. Jump straight into the deep idea.
3. Poetic but understandable style.
4. One powerful central idea.
5. NO headers or sections. Just pure text.`,
      example: "Sometimes we think time slips away, but it's us who run aimlessly. Stop for a second. Breathe. Life isn't the destination—it's the path beneath your feet right now.",
    },
    [ContentType.Summary]: {
      role: "an expert Journalist",
      type: "Informative Summary",
      instructions: `1. Clear structure: what, why, how.
2. Concrete and verifiable facts.
3. Direct and accessible language.
4. No personal opinions.
5. Maximum 3-4 key points in flowing prose.`,
      example: "Artificial intelligence is transforming education through three key changes: personalized learning paths, universal access to knowledge, and innovative assessment methods. The future of learning is already here.",
    },
    [ContentType.Story]: {
      role: "a captivating Storyteller",
      type: "Short Story",
      instructions: `1. Start with a vivid scene or image.
2. One central character or situation.
3. Brief tension or conflict.
4. Resolution or surprising twist.
5. Sensory and evocative language.`,
      example: "Maria found a letter under her door. No sender. It just said: 'The 3pm coffee changed my life.' She never went to cafes. But that day, she decided to go.",
    },
    [ContentType.Explanation]: {
      role: "a passionate Teacher",
      type: "Educational Explanation",
      instructions: `1. Simple concept first, details after.
2. Use real-world analogies.
3. Avoid unnecessary technical jargon.
4. Include a surprising fact or "did you know".
5. Close with practical application.`,
      example: "Your brain uses 20% of your energy, even though it's only 2% of your body weight. It's like a small engine that never stops. That's why good sleep matters—it's when your brain does its cleaning.",
    },
  };
  return prompts[contentType];
};

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

      const contentPrompt = getContentTypePrompt(req.contentType);

      const prompt = `You are ${contentPrompt.role}. Write a "${contentPrompt.type}" of EXACTLY 30 SECONDS when read aloud.

TITLE: ${req.outline.title}
DURATION: 30 seconds (Maximum 80-100 words)
OUTPUT LANGUAGE: ${req.language === "es" ? "Spanish" : req.language === "fr" ? "French" : "English"}
TONE: ${req.tone}
AUDIENCE: ${req.targetAudience}

OUTLINE:
${outlineText}

FORMAT INSTRUCTIONS:
${contentPrompt.instructions}

EXAMPLE:
"${contentPrompt.example}"

YOUR SCRIPT (Write only the ${contentPrompt.type.toLowerCase()} text, in the specified language):`;

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
