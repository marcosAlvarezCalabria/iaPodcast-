import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, OutlineRequest, ScriptRequest } from "../types";
import type { LLMProvider } from "./LLMProvider";

const loadGemini = () => import("@google/generative-ai");

const ensureGemini = async (): Promise<void> => {
  await loadGemini().catch((error) => {
    throw new ProviderUnavailableError(
      "Gemini SDK not installed. Install the `@google/generative-ai` package to enable this provider.",
      { provider: "gemini", cause: error },
    );
  });
};

export const createGeminiProvider = (): LLMProvider => {
  return {
    name: () => "gemini",
    async generateOutline(_req: OutlineRequest, _ctx?: ProviderContext) {
      await ensureGemini();
      throw new ProviderUnavailableError(
        "Gemini provider stub not implemented.",
        { provider: "gemini" },
      );
    },
    async generateScript(_req: ScriptRequest, _ctx?: ProviderContext) {
      await ensureGemini();
      throw new ProviderUnavailableError(
        "Gemini provider stub not implemented.",
        { provider: "gemini" },
      );
    },
  };
};
