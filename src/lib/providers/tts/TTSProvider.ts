import type { ProviderContext, TTSRequest, TTSResult } from "../types";

export interface TTSProvider {
  name(): string;
  speak(req: TTSRequest, ctx?: ProviderContext): Promise<TTSResult>;
}
