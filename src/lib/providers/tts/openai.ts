import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, TTSRequest } from "../types";
import type { TTSProvider } from "./TTSProvider";

// TODO: Install `openai` package and implement this provider
export const createOpenAITTSProvider = (): TTSProvider => {
  return {
    name: () => "openai",
    async speak(_req: TTSRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "OpenAI TTS provider not implemented. Install `openai` package and implement this provider.",
        { provider: "openai" },
      );
    },
  };
};
