import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, TTSRequest } from "../types";
import type { TTSProvider } from "./TTSProvider";

const loadOpenAI = () => import("openai");

const ensureOpenAI = async (): Promise<void> => {
  await loadOpenAI().catch((error) => {
    throw new ProviderUnavailableError(
      "OpenAI SDK not installed. Install the `openai` package to enable this provider.",
      { provider: "openai", cause: error },
    );
  });
};

export const createOpenAITTSProvider = (): TTSProvider => {
  return {
    name: () => "openai",
    async speak(_req: TTSRequest, _ctx?: ProviderContext) {
      await ensureOpenAI();
      throw new ProviderUnavailableError(
        "OpenAI TTS provider stub not implemented.",
        { provider: "openai" },
      );
    },
  };
};
