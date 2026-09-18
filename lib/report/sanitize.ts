const SECRET_KEY_RE =
  /^(api[_-]?key|secret|passphrase|authorization|cookie|set-cookie|access[_-]?token|refresh[_-]?token|private[_-]?key|bitget_api_key|bitget_api_secret|bitget_passphrase)$/i;

const SECRET_VALUE_RE = /\b(BITGET_API_KEY|BITGET_API_SECRET|BITGET_PASSPHRASE|API_SECRET|API_KEY)\s*=/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key);
}

export function containsSecretValue(value: string): boolean {
  return SECRET_VALUE_RE.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeForExport<T>(value: T): T {
  return sanitizeNode(value) as T;
}

function sanitizeNode(value: unknown): unknown {
  if (typeof value === "string") {
    return containsSecretValue(value) ? "[redacted]" : value;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNode(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      if (isSecretKey(key)) {
        continue;
      }
      next[key] = sanitizeNode(item);
    }
    return next;
  }
  return value;
}
