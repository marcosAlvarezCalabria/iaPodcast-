import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, TTSRequest } from "../types";
import type { TTSProvider } from "./TTSProvider";

// TODO: Install `@google-cloud/text-to-speech` package and implement this provider
export const createGCPTTSProvider = (): TTSProvider => {
  return {
    name: () => "gcp",
    async speak(_req: TTSRequest, _ctx?: ProviderContext) {
      throw new ProviderUnavailableError(
        "GCP TTS provider not implemented. Install `@google-cloud/text-to-speech` package and implement this provider.",
        { provider: "gcp" },
      );
    },
  };
};
