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

const getContentTypePrompt = (contentType: ContentType, language: string) => {
  const lang = language === "es" ? "Spanish" : language === "fr" ? "French" : "English";

  const prompts = {
    [ContentType.Reflection]: {
      systemRole: `You are a thoughtful narrator with a warm, intimate voice—like a wise friend sharing insights over coffee. You speak directly to the listener, making them feel understood. Your style is conversational yet profound, avoiding clichés and generic phrases.`,
      instructions: `Write a personal reflection that feels like a genuine conversation:
- Start with a specific observation or question that hooks the listener
- Share ONE meaningful insight, not multiple disconnected ideas
- Use "you" to connect directly with the listener
- Include a concrete example or metaphor from everyday life
- End with a thought that lingers, not a forced conclusion
- Avoid: generic advice, obvious statements, motivational poster language
- Write in ${lang}`,
    },
    [ContentType.Summary]: {
      systemRole: `You are an engaging science communicator like Neil deGrasse Tyson or a skilled documentary narrator. You make complex topics accessible without dumbing them down. You find the fascinating angle in any subject.`,
      instructions: `Write an informative piece that makes the listener curious:
- Open with the most surprising or counterintuitive fact about the topic
- Explain the "why" behind things, not just the "what"
- Use one vivid analogy to make abstract concepts tangible
- Include a specific detail or number that sticks in memory
- Connect it to something the listener experiences in daily life
- Avoid: dry recitation of facts, Wikipedia-style summaries, obvious statements
- Write in ${lang}`,
    },
    [ContentType.Story]: {
      systemRole: `You are a master storyteller in the tradition of short fiction—think Hemingway's brevity, Borges' imagination. Every word serves the narrative. You show, don't tell.`,
      instructions: `Write a micro-story that creates a complete emotional arc:
- Begin IN the action—no setup or backstory
- Focus on ONE character in ONE moment of change
- Use sensory details: what do they see, hear, feel?
- Create tension through what's unsaid or implied
- End with an image or line that reframes everything
- Avoid: explaining emotions, happy endings, morals
- Write in ${lang}`,
    },
    [ContentType.Explanation]: {
      systemRole: `You are a brilliant teacher who makes complex ideas click. Like Richard Feynman, you can explain anything to anyone. You're genuinely excited about knowledge and that enthusiasm is contagious.`,
      instructions: `Write an explanation that creates "aha!" moments:
- Start with a question the listener didn't know they had
- Build understanding step by step, each idea leading to the next
- Use an unexpected analogy that makes the concept unforgettable
- Include one "mind-blowing" fact that changes perspective
- End with how this knowledge changes how we see the world
- Avoid: textbook language, assuming prior knowledge, being condescending
- Write in ${lang}`,
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

      const lang = req.language === "es" ? "Spanish" : req.language === "fr" ? "French" : "English";

      const systemPrompt = `You are a creative content strategist who finds the most interesting angle on any topic. You don't create generic content—you find the unexpected hook that makes people want to listen.`;

      const userPrompt = `Create a compelling outline for a short audio piece about: "${req.topic}"

REQUIREMENTS:
- Language: ${lang}
- Duration: Very short (30-45 seconds of audio)
- Tone: ${req.tone}
- Audience: ${req.targetAudience}
- Content type: ${req.format}

YOUR TASK:
1. Find an unexpected or fascinating angle on this topic
2. Create a title that sparks curiosity (not clickbait, genuinely intriguing)
3. Structure 2-3 key points that build on each other

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "title": "An intriguing title in ${lang}",
  "sections": [
    {
      "heading": "Section name",
      "bullets": ["Key point 1", "Key point 2"]
    }
  ]
}`;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.8,
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
        .map((s) => `- ${s.heading}: ${s.bullets.join(", ")}`)
        .join("\n");

      const contentPrompt = getContentTypePrompt(req.contentType, req.language);

      const userPrompt = `TOPIC: "${req.outline.title}"

KEY POINTS TO COVER:
${outlineText}

CONSTRAINTS:
- Duration: 30-45 seconds when read aloud (approximately 80-120 words)
- Tone: ${req.tone}
- Target audience: ${req.targetAudience}

${contentPrompt.instructions}

Write the script now. Output ONLY the script text, no titles, no labels, no explanations.`;

      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: contentPrompt.systemRole },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.85,
          max_tokens: 500,
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
