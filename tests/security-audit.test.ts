import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { sanitizeForExport, escapeHtml } from "@/lib/report/sanitize";

describe("Security & Launch Readiness Audit Tests", () => {
  it("enforces strict security headers in next.config", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.headers).toBeDefined();

    const headersList = await nextConfig.headers!();
    const globalHeaderRule = headersList.find((h) => h.source === "/:path*");
    expect(globalHeaderRule).toBeDefined();

    const headerMap = new Map(globalHeaderRule!.headers.map((h) => [h.key, h.value]));
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(headerMap.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
  });

  it("redacts credentials from serialized exports and prevents leaks", () => {
    const rawData = {
      apiKey: "1234567890",
      BITGET_API_KEY: "secret_val",
      BITGET_API_SECRET: "secret_val2",
      safeToken: "rAAPL",
      userNote: "My note with BITGET_API_KEY=abc123456 inside text",
    };

    const sanitized = sanitizeForExport(rawData);
    const json = JSON.stringify(sanitized);

    expect(json).not.toContain("1234567890");
    expect(json).not.toContain("secret_val");
    expect(json).not.toContain("secret_val2");
    expect(json).toContain("rAAPL");
    expect(json).toContain("[redacted]");
  });

  it("escapes malicious payloads to prevent XSS in reports", () => {
    const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1) />';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&quot;xss&quot;");
  });

  it("provides valid robots.txt and sitemap.xml endpoints", () => {
    const robotsData = robots();
    expect(robotsData.rules).toBeDefined();
    expect(robotsData.sitemap).toContain("sitemap.xml");

    const sitemapData = sitemap();
    expect(sitemapData.length).toBeGreaterThanOrEqual(3);
    const urls = sitemapData.map((s) => s.url);
    expect(urls.some((u) => u.endsWith("/privacy"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/terms"))).toBe(true);
  });
});
