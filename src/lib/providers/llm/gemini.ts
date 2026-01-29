import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, OutlineRequest, ScriptRequest } from "../types";
import type { LLMProvider } from "./LLMProvider";

// TODO: Install `@google/generative-ai` package and implement this provider
export const createGeminiProvider = (): LLMProvider => {
  return {
    name: () => "gemini",
    async generateOutline(_req: OutlineRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "Gemini provider not implemented. Install `@google/generative-ai` package and implement this provider.",
        { provider: "gemini" },
      );
    },
    async generateScript(_req: ScriptRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "Gemini provider not implemented. Install `@google/generative-ai` package and implement this provider.",
        { provider: "gemini" },
      );
    },
  };
};
