import type {
  LLMResult,
  OutlineRequest,
  PodcastOutline,
  ProviderContext,
  ScriptRequest,
} from "../types";

export interface LLMProvider {
  name(): string;
  generateOutline(
    req: OutlineRequest,
    ctx?: ProviderContext,
  ): Promise<LLMResult<PodcastOutline>>;
  generateScript(
    req: ScriptRequest,
    ctx?: ProviderContext,
  ): Promise<LLMResult<{ markdown: string }>>;
}
