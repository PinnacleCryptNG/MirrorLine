import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runLaunchAuditWalkthrough() {
  console.log("=== SECURITY HARDENING & LAUNCH READINESS BROWSER AUDIT ===");

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,950",
    ],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  const consoleLogs = [];
  const pageErrors = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => pageErrors.push(err.toString()));

  // 1. Audit Privacy Page
  console.log("1. Checking Privacy Policy page (/privacy)");
  const privacyRes = await page.goto("http://127.0.0.1:43123/privacy", { waitUntil: "networkidle2" });
  console.log("Privacy status:", privacyRes.status());
  const privacyHeaders = privacyRes.headers();
  console.log("Privacy security headers:", {
    "x-frame-options": privacyHeaders["x-frame-options"],
    "x-content-type-options": privacyHeaders["x-content-type-options"],
    "content-security-policy": privacyHeaders["content-security-policy"] ? "present" : "missing",
  });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "launch_01_privacy_page.png") });

  // 2. Audit Terms Page
  console.log("2. Checking Terms and Conditions page (/terms)");
  const termsRes = await page.goto("http://127.0.0.1:43123/terms", { waitUntil: "networkidle2" });
  console.log("Terms status:", termsRes.status());
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "launch_02_terms_page.png") });

  // 3. Audit 404 Page
  console.log("3. Checking custom branded 404 page (/non-existent-route)");
  const notFoundRes = await page.goto("http://127.0.0.1:43123/non-existent-route", { waitUntil: "networkidle2" });
  console.log("404 status:", notFoundRes.status());
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "launch_03_custom_404.png") });

  // 4. Audit Robots and Sitemap
  console.log("4. Checking robots.txt and sitemap.xml");
  const robotsRes = await page.goto("http://127.0.0.1:43123/robots.txt", { waitUntil: "networkidle2" });
  console.log("robots.txt status:", robotsRes.status());
  const sitemapRes = await page.goto("http://127.0.0.1:43123/sitemap.xml", { waitUntil: "networkidle2" });
  console.log("sitemap.xml status:", sitemapRes.status());

  // 5. Audit Homepage with New Footer Links and OG metadata
  console.log("5. Checking Homepage footer links and metadata");
  const homeRes = await page.goto("http://127.0.0.1:43123/", { waitUntil: "networkidle2" });
  console.log("Homepage status:", homeRes.status());
  const homeTitle = await page.title();
  console.log("Homepage title:", homeTitle);

  const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute("content")).catch(() => null);
  console.log("OG title:", ogTitle);

  // Scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "launch_04_homepage_footer.png") });

  // 6. Test Mobile Viewport for Privacy Page
  console.log("6. Checking mobile viewport on Privacy Policy (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:43123/privacy", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "launch_05_mobile_privacy.png") });

  // 7. Verify console errors
  console.log("Console errors:", pageErrors);
  await browser.close();
  console.log("=== LAUNCH AUDIT WALKTHROUGH COMPLETED SUCCESSFULLY ===");
}

runLaunchAuditWalkthrough().catch((err) => {
  console.error("Audit walkthrough failed:", err);
  process.exit(1);
});
