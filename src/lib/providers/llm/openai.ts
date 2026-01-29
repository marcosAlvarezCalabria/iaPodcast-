import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, OutlineRequest, ScriptRequest } from "../types";
import type { LLMProvider } from "./LLMProvider";

// TODO: Install `openai` package and implement this provider
export const createOpenAIProvider = (): LLMProvider => {
  return {
    name: () => "openai",
    async generateOutline(_req: OutlineRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "OpenAI provider not implemented. Install `openai` package and implement this provider.",
        { provider: "openai" },
      );
    },
    async generateScript(_req: ScriptRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "OpenAI provider not implemented. Install `openai` package and implement this provider.",
        { provider: "openai" },
      );
    },
  };
};
