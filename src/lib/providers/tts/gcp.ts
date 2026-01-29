import { ProviderUnavailableError } from "../errors";
import type { ProviderContext, TTSRequest } from "../types";
import type { TTSProvider } from "./TTSProvider";

const loadGCP = () => import("@google-cloud/text-to-speech");

const ensureGCP = async (): Promise<void> => {
  await loadGCP().catch((error) => {
    throw new ProviderUnavailableError(
      "GCP Text-to-Speech SDK not installed. Install the `@google-cloud/text-to-speech` package to enable this provider.",
      { provider: "gcp", cause: error },
    );
  });
};

export const createGCPTTSProvider = (): TTSProvider => {
  return {
    name: () => "gcp",
    async speak(_req: TTSRequest, _ctx?: ProviderContext) {
      await ensureGCP();
      throw new ProviderUnavailableError(
        "GCP TTS provider stub not implemented.",
        { provider: "gcp" },
      );
    },
  };
};
