export type ProviderFailure = {
  provider: string;
  message: string;
  cause?: unknown;
};

export class ProviderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProviderError";
    this.cause = cause;
  }
}

export class ProviderConfigError extends ProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ProviderConfigError";
  }
}

export class ProviderUnavailableError extends ProviderError {
  readonly provider?: string;

  constructor(message: string, options?: { provider?: string; cause?: unknown }) {
    super(message, options?.cause);
    this.name = "ProviderUnavailableError";
    this.provider = options?.provider;
  }
}

export class ProviderCallError extends ProviderError {
  readonly provider?: string;
  readonly failures: ProviderFailure[];

  constructor(
    message: string,
    options?: { provider?: string; failures?: ProviderFailure[]; cause?: unknown },
  ) {
    super(message, options?.cause);
    this.name = "ProviderCallError";
    this.provider = options?.provider;
    this.failures = options?.failures ?? [];
  }
}
