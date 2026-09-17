import { createHmac } from "node:crypto";
import { BitgetError } from "./errors";
import { bitgetEnvelopeSchema } from "./schemas";
import { BITGET_SUCCESS_CODE, type BitgetEnvelope } from "./types";

export interface BitgetClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  fetchImpl?: typeof fetch;
}

export interface BitgetRequestOptions {
  auth?: boolean;
  timeoutMs?: number;
  searchParams?: Record<string, string | number | undefined>;
}

const DEFAULT_BASE_URL = "https://api.bitget.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function getBitgetConfigFromEnv(): BitgetClientConfig {
  return {
    baseUrl: env("BITGET_BASE_URL") ?? DEFAULT_BASE_URL,
    timeoutMs: env("BITGET_TIMEOUT_MS") ? Number(env("BITGET_TIMEOUT_MS")) : DEFAULT_TIMEOUT_MS,
    apiKey: env("BITGET_API_KEY"),
    apiSecret: env("BITGET_API_SECRET"),
    passphrase: env("BITGET_PASSPHRASE"),
  };
}

function buildQuery(searchParams?: Record<string, string | number | undefined>): string {
  if (!searchParams) {
    return "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

function signRequest(secret: string, timestamp: string, method: string, requestPath: string, body: string) {
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BitgetClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly passphrase?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: BitgetClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.passphrase = config.passphrase;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  hasPrivateCredentials(): boolean {
    return Boolean(this.apiKey && this.apiSecret && this.passphrase);
  }

  async get<T>(path: string, options: BitgetRequestOptions = {}): Promise<BitgetEnvelope<T>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        return await this.getOnce<T>(path, options);
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof BitgetError &&
          (error.httpStatus === 429 || error.providerCode === "429");
        if (!retryable || attempt === MAX_RETRIES) {
          throw error;
        }
        await sleep(300 * 2 ** attempt);
      }
    }
    throw lastError;
  }

  private async getOnce<T>(path: string, options: BitgetRequestOptions): Promise<BitgetEnvelope<T>> {
    const query = buildQuery(options.searchParams);
    const requestPath = `${path}${query}`;
    const url = `${this.baseUrl}${requestPath}`;
    const method = "GET";
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = {
      Accept: "application/json",
      locale: "en-US",
    };

    if (options.auth) {
      if (!this.hasPrivateCredentials()) {
        clearTimeout(timeout);
        throw new BitgetError({
          code: "BITGET_AUTH_REQUIRED",
          message:
            "This Bitget endpoint requires API credentials. Set BITGET_API_KEY, BITGET_API_SECRET, and BITGET_PASSPHRASE on the server. Reality order-book depth and fills may also require UID whitelist access from Bitget BD.",
          httpStatus: 403,
          path: requestPath,
        });
      }
      const timestamp = Date.now().toString();
      headers["ACCESS-KEY"] = this.apiKey!;
      headers["ACCESS-PASSPHRASE"] = this.passphrase!;
      headers["ACCESS-TIMESTAMP"] = timestamp;
      headers["ACCESS-SIGN"] = signRequest(this.apiSecret!, timestamp, method, requestPath, "");
      headers["Content-Type"] = "application/json";
    }

    const retrievedAt = new Date();
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });

      const rawText = await response.text();
      let parsed: unknown;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new BitgetError({
          code: "BITGET_HTTP_ERROR",
          message: `Bitget returned a non-JSON response (HTTP ${response.status}).`,
          httpStatus: response.status,
          path: requestPath,
          details: { bodyPreview: rawText.slice(0, 240) },
        });
      }

      const envelopeResult = bitgetEnvelopeSchema.safeParse(parsed);
      if (!envelopeResult.success) {
        throw new BitgetError({
          code: "BITGET_VALIDATION",
          message: "Bitget response did not match the expected envelope.",
          httpStatus: 502,
          path: requestPath,
          details: envelopeResult.error.flatten(),
        });
      }

      const envelope = envelopeResult.data;
      if (envelope.code !== BITGET_SUCCESS_CODE) {
        throw this.mapProviderError(envelope.code, envelope.msg, requestPath, response.status);
      }

      if (!response.ok) {
        throw new BitgetError({
          code: response.status === 429 ? "BITGET_API_ERROR" : "BITGET_HTTP_ERROR",
          message: `Bitget HTTP ${response.status}: ${envelope.msg}`,
          httpStatus: response.status,
          providerCode: envelope.code,
          path: requestPath,
        });
      }

      return {
        code: envelope.code,
        msg: envelope.msg,
        requestTime: envelope.requestTime ?? retrievedAt.getTime(),
        data: envelope.data as T,
      };
    } catch (error) {
      if (error instanceof BitgetError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new BitgetError({
          code: "BITGET_TIMEOUT",
          message: `Bitget request timed out after ${timeoutMs}ms.`,
          httpStatus: 504,
          path: requestPath,
        });
      }
      throw new BitgetError({
        code: "BITGET_NETWORK",
        message: error instanceof Error ? error.message : "Bitget network request failed.",
        httpStatus: 502,
        path: requestPath,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapProviderError(providerCode: string, message: string, path: string, httpStatus: number) {
    if (providerCode === "40006" || providerCode === "40008" || /access[_-]?key/i.test(message)) {
      return new BitgetError({
        code: "BITGET_AUTH_REQUIRED",
        message: `Bitget rejected the request: ${message}`,
        httpStatus: 403,
        providerCode,
        path,
      });
    }
    if (providerCode === "40018" || /whitelist/i.test(message)) {
      return new BitgetError({
        code: "BITGET_WHITELIST_REQUIRED",
        message: `Bitget requires whitelist access for this Reality endpoint: ${message}`,
        httpStatus: 403,
        providerCode,
        path,
      });
    }
    if (providerCode === "40404" || /not found/i.test(message)) {
      return new BitgetError({
        code: "BITGET_NOT_FOUND",
        message: `Bitget endpoint or resource was not found: ${message}`,
        httpStatus: 404,
        providerCode,
        path,
      });
    }
    if (providerCode === "429" || /too many requests/i.test(message)) {
      return new BitgetError({
        code: "BITGET_API_ERROR",
        message: `Bitget API error 429: Too Many Requests`,
        httpStatus: 429,
        providerCode,
        path,
      });
    }
    if (providerCode === "48001" || /parameter validation failed/i.test(message)) {
      return new BitgetError({
        code: "BITGET_VALIDATION",
        message: `Bitget parameter validation failed: ${message}`,
        httpStatus: 400,
        providerCode,
        path,
      });
    }
    return new BitgetError({
      code: "BITGET_API_ERROR",
      message: `Bitget API error ${providerCode}: ${message}`,
      httpStatus: httpStatus >= 400 ? httpStatus : 502,
      providerCode,
      path,
    });
  }
}

let cachedClient: BitgetClient | undefined;

export function getBitgetClient(): BitgetClient {
  if (!cachedClient) {
    cachedClient = new BitgetClient(getBitgetConfigFromEnv());
  }
  return cachedClient;
}

export function createBitgetClient(config?: BitgetClientConfig): BitgetClient {
  return new BitgetClient(config ?? getBitgetConfigFromEnv());
}
