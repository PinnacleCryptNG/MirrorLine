import { describe, expect, it, vi } from "vitest";
import { BitgetClient } from "@/lib/bitget/client";
import { BitgetError } from "@/lib/bitget/errors";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("BitgetClient", () => {
  it("returns parsed envelopes on success code 00000", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        code: "00000",
        msg: "success",
        requestTime: 1,
        data: [{ symbol: "RAAPLUSDT" }],
      }),
    );
    const client = new BitgetClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await client.get<unknown[]>("/api/v3/market/tickers", {
      searchParams: { category: "SPOT", symbol: "RAAPLUSDT" },
    });
    expect(result.data).toEqual([{ symbol: "RAAPLUSDT" }]);
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(String(firstCall[0])).toContain(
      "/api/v3/market/tickers?category=SPOT&symbol=RAAPLUSDT",
    );
  });

  it("maps Bitget parameter errors clearly", async () => {
    const client = new BitgetClient({
      fetchImpl: (async () =>
        jsonResponse({
          code: "48001",
          msg: "Parameter validation failed null",
          requestTime: 1,
          data: null,
        })) as unknown as typeof fetch,
    });
    await expect(client.get("/api/v3/market/candles")).rejects.toMatchObject({
      code: "BITGET_VALIDATION",
    });
  });

  it("does not send secrets on public requests", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ code: "00000", msg: "success", requestTime: 1, data: [] }),
    );
    const client = new BitgetClient({
      apiKey: "secret-key",
      apiSecret: "secret-secret",
      passphrase: "secret-pass",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.get("/api/v3/market/tickers");
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit | undefined];
    const headers = firstCall[1]?.headers as Record<string, string>;
    expect(headers["ACCESS-KEY"]).toBeUndefined();
  });

  it("requires credentials before calling private Reality endpoints", async () => {
    const client = new BitgetClient({ fetchImpl: vi.fn() as unknown as typeof fetch });
    await expect(
      client.get("/api/v3/account/reality-orderbook", { auth: true, searchParams: { symbol: "RAAPLUSDT" } }),
    ).rejects.toBeInstanceOf(BitgetError);
  });

  it("times out when the provider does not respond", async () => {
    const client = new BitgetClient({
      timeoutMs: 20,
      fetchImpl: (async (_url: string | URL, init?: RequestInit) => {
        await new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
        return jsonResponse({});
      }) as unknown as typeof fetch,
    });
    await expect(client.get("/api/v3/market/tickers")).rejects.toMatchObject({
      code: "BITGET_TIMEOUT",
    });
  });
});
