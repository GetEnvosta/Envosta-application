/**
 * Typed error hierarchy for integration clients.
 *
 * Callers can check `error.retryable` to decide whether to retry, and
 * narrow by class for specific handling. All integration clients throw
 * subclasses of IntegrationError, never raw Error.
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public provider: 'wpcloud' | 'opensrs' | 'stripe' | 'resend',
    public retryable: boolean,
    public status?: number,
    public body?: unknown,
    public path?: string,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class TransientIntegrationError extends IntegrationError {
  constructor(message: string, provider: IntegrationError['provider'], status?: number, body?: unknown, path?: string) {
    super(message, provider, true, status, body, path);
    this.name = 'TransientIntegrationError';
  }
}

export class AuthIntegrationError extends IntegrationError {
  constructor(message: string, provider: IntegrationError['provider'], status?: number, body?: unknown, path?: string) {
    super(message, provider, false, status, body, path);
    this.name = 'AuthIntegrationError';
  }
}

export class NotFoundIntegrationError extends IntegrationError {
  constructor(message: string, provider: IntegrationError['provider'], path?: string) {
    super(message, provider, false, 404, undefined, path);
    this.name = 'NotFoundIntegrationError';
  }
}

export class ValidationIntegrationError extends IntegrationError {
  constructor(message: string, provider: IntegrationError['provider'], status?: number, body?: unknown, path?: string) {
    super(message, provider, false, status, body, path);
    this.name = 'ValidationIntegrationError';
  }
}

export class TimeoutIntegrationError extends IntegrationError {
  constructor(message: string, provider: IntegrationError['provider'], path?: string) {
    super(message, provider, true, undefined, undefined, path);
    this.name = 'TimeoutIntegrationError';
  }
}

/**
 * Classify an HTTP error by status code.
 * 5xx + 429 + network failures → transient (retry)
 * 401/403 → auth (don't retry)
 * 404 → not found (don't retry)
 * Other 4xx → validation (don't retry)
 */
export function classifyHttpError(
  status: number,
  provider: IntegrationError['provider'],
  body: unknown,
  path?: string,
): IntegrationError {
  const message = `${provider} ${path ?? ''} returned ${status}`;
  if (status >= 500 || status === 429 || status === 408) {
    return new TransientIntegrationError(message, provider, status, body, path);
  }
  if (status === 401 || status === 403) {
    return new AuthIntegrationError(message, provider, status, body, path);
  }
  if (status === 404) {
    return new NotFoundIntegrationError(message, provider, path);
  }
  return new ValidationIntegrationError(message, provider, status, body, path);
}
