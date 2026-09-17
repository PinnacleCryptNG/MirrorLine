export type BitgetErrorCode =
  | "BITGET_HTTP_ERROR"
  | "BITGET_TIMEOUT"
  | "BITGET_NETWORK"
  | "BITGET_API_ERROR"
  | "BITGET_VALIDATION"
  | "BITGET_NOT_FOUND"
  | "BITGET_AUTH_REQUIRED"
  | "BITGET_WHITELIST_REQUIRED"
  | "BITGET_UNSUPPORTED_INTERVAL"
  | "BITGET_UNAVAILABLE";

export class BitgetError extends Error {
  readonly code: BitgetErrorCode;
  readonly httpStatus: number;
  readonly providerCode?: string;
  readonly path?: string;
  readonly details?: unknown;

  constructor(options: {
    code: BitgetErrorCode;
    message: string;
    httpStatus?: number;
    providerCode?: string;
    path?: string;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "BitgetError";
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? 502;
    this.providerCode = options.providerCode;
    this.path = options.path;
    this.details = options.details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      providerCode: this.providerCode,
      path: this.path,
      details: this.details,
    };
  }
}

export function isBitgetError(error: unknown): error is BitgetError {
  return error instanceof BitgetError;
}

export function httpStatusForBitgetError(error: BitgetError): number {
  if (error.code === "BITGET_VALIDATION" || error.code === "BITGET_UNSUPPORTED_INTERVAL") {
    return 400;
  }
  if (error.code === "BITGET_NOT_FOUND") {
    return 404;
  }
  if (error.code === "BITGET_AUTH_REQUIRED" || error.code === "BITGET_WHITELIST_REQUIRED") {
    return 403;
  }
  if (error.code === "BITGET_TIMEOUT") {
    return 504;
  }
  return error.httpStatus;
}
