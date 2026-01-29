import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, OutlineRequest, ScriptRequest } from "../types";
import type { LLMProvider } from "./LLMProvider";

const loadOpenAI = () => import("openai");

const ensureOpenAI = async (): Promise<void> => {
  await loadOpenAI().catch((error) => {
    throw new ProviderUnavailableError(
      "OpenAI SDK not installed. Install the `openai` package to enable this provider.",
      { provider: "openai", cause: error },
    );
  });
};

export const createOpenAIProvider = (): LLMProvider => {
  return {
    name: () => "openai",
    async generateOutline(_req: OutlineRequest, _ctx?: ProviderContext) {
      await ensureOpenAI();
      throw new ProviderUnavailableError(
        "OpenAI provider stub not implemented.",
        { provider: "openai" },
      );
    },
    async generateScript(_req: ScriptRequest, _ctx?: ProviderContext) {
      await ensureOpenAI();
      throw new ProviderUnavailableError(
        "OpenAI provider stub not implemented.",
        { provider: "openai" },
      );
    },
  };
};
