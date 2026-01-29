import {
  ProviderCallError,
  ProviderConfigError,
  ProviderUnavailableError,
} from "./errors";
import type { ProviderFailure } from "./errors";
import type { LLMProvider } from "./llm/LLMProvider";
import { createGeminiProvider } from "./llm/gemini";
import { createMockLLMProvider } from "./llm/mock";
import { createOpenAIProvider } from "./llm/openai";
import type { TTSProvider } from "./tts/TTSProvider";
import { createGCPTTSProvider } from "./tts/gcp";
import { createMockTTSProvider } from "./tts/mock";
import { createOpenAITTSProvider } from "./tts/openai";

export type Provider = LLMProvider | TTSProvider;

export const DEFAULT_PROVIDER = "mock" as const;

export const providersRegistry = {
  llm: {
    mock: createMockLLMProvider,
    openai: createOpenAIProvider,
    gemini: createGeminiProvider,
  },
  tts: {
    mock: createMockTTSProvider,
    openai: createOpenAITTSProvider,
    gcp: createGCPTTSProvider,
  },
} as const;

export const resolveProviderList = (
  envValue: string | undefined,
  defaultName: string,
): string[] => {
  if (!envValue) {
    return [defaultName];
  }
  const providers = envValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return providers.length > 0 ? providers : [defaultName];
};

const isDebugEnabled = (): boolean => process.env.PROVIDER_DEBUG === "true";

const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  if (isDebugEnabled()) {
    console.debug(message, meta ?? {});
  }
};

export const createFallbackProvider = <T extends Provider>(
  providers: T[],
): T => {
  if (providers.length === 0) {
    throw new ProviderUnavailableError("No providers available for fallback.");
  }

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === "name") {
        return () => `fallback(${providers.map((p) => p.name()).join(",")})`;
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }

      return async (...args: unknown[]) => {
        const failures: ProviderFailure[] = [];
        for (const provider of providers) {
          const method = (provider as Record<string, unknown>)[
            prop as string
          ] as ((...methodArgs: unknown[]) => Promise<unknown>) | undefined;

          if (typeof method !== "function") {
            failures.push({
              provider: provider.name(),
              message: `Provider missing method ${String(prop)}`,
            });
            continue;
          }

          try {
            logDebug("provider:attempt", {
              provider: provider.name(),
              method: String(prop),
            });
            return await method.apply(provider, args);
          } catch (error) {
            failures.push({
              provider: provider.name(),
              message: error instanceof Error ? error.message : String(error),
              cause: error,
            });
            logDebug("provider:failure", {
              provider: provider.name(),
              method: String(prop),
              error,
            });
          }
        }

        throw new ProviderCallError(
          `All providers failed for ${String(prop)}.`,
          {
            failures,
            cause: failures[failures.length - 1]?.cause,
          },
        );
      };
    },
  };

  return new Proxy(providers[0], handler);
};

const resolveLLMProvider = (name: string): LLMProvider => {
  const factory = providersRegistry.llm[name as keyof typeof providersRegistry.llm];
  if (!factory) {
    throw new ProviderConfigError(`Unknown LLM provider: ${name}`);
  }
  return factory();
};

const resolveTTSProvider = (name: string): TTSProvider => {
  const factory = providersRegistry.tts[name as keyof typeof providersRegistry.tts];
  if (!factory) {
    throw new ProviderConfigError(`Unknown TTS provider: ${name}`);
  }
  return factory();
};

export const getLLMProvider = (): LLMProvider => {
  const providerList = resolveProviderList(
    process.env.LLM_PROVIDER,
    DEFAULT_PROVIDER,
  );
  const providers = providerList.map(resolveLLMProvider);
  return providers.length === 1
    ? providers[0]
    : createFallbackProvider(providers);
};

export const getTTSProvider = (): TTSProvider => {
  const providerList = resolveProviderList(
    process.env.TTS_PROVIDER,
    DEFAULT_PROVIDER,
  );
  const providers = providerList.map(resolveTTSProvider);
  return providers.length === 1
    ? providers[0]
    : createFallbackProvider(providers);
};
