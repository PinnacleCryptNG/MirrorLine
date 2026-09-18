import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runMilestone11Walkthrough() {
  console.log("=== MILESTONE 11: REPRODUCIBLE DEMO & ORIENTATION WALKTHROUGH ===");

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

  // 1. Initial Page Load
  console.log("1. Navigating to Desk (Desktop 1280x950)");
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_01_orientation_desk.png") });

  // 2. Test Orientation Guide collapse/expand
  console.log("2. Testing orientation guide toggle");
  const toggleBtn = await page.$('button[aria-label="Collapse orientation guide"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    const expandBtn = await page.$('button[aria-label="Expand orientation guide"]');
    if (expandBtn) {
      await expandBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 3. Switch to Demo Fixture Mode via header toggle
  console.log("3. Switching to Demo Fixture Mode");
  const modeBtn = await page.$('button[aria-label="Switch to reproducible demo fixture mode"]');
  if (modeBtn) {
    await modeBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_02_demo_mode_banner.png") });

  // 4. Select Scenario 2: rNVDA (Overnight Upside)
  console.log("4. Selecting rNVDA overnight upside scenario");
  const nvdaBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rNVDA · Overnight") || b.textContent?.includes("rNVDA · Post-Close"));
  });
  if (nvdaBtn.asElement()) {
    await nvdaBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_03_rnvda_scenario.png") });
  }

  // 5. Select Scenario 3: rTSLA (Weekend & Stale Ticker)
  console.log("5. Selecting rTSLA weekend & stale scenario");
  const tslaBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rTSLA · Weekend"));
  });
  if (tslaBtn.asElement()) {
    await tslaBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_04_rtsla_stale_scenario.png") });
  }

  // 6. Return to Scenario 1: rAAPL (Regular Session Downside)
  console.log("6. Returning to rAAPL scenario and inspecting claims");
  const aaplBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rAAPL · Regular"));
  });
  if (aaplBtn.asElement()) {
    await aaplBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Scroll to challenge panel
  await page.evaluate(() => {
    const el = document.querySelector("#challenge-heading") || document.querySelector("section:has(#challenge-heading)");
    if (el) el.scrollIntoView();
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_05_claim_assessments.png") });

  // 7. Preview Investigation Report
  console.log("7. Previewing investigation report with demo fixture banner");
  const previewReportBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Preview report"));
  });
  if (previewReportBtn.asElement()) {
    await previewReportBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_06_investigation_report_preview.png") });
  }

  // 8. Multi-symbol Comparison Desk: Load Demo Comparison (rAAPL vs rNVDA)
  console.log("8. Testing Multi-Symbol Demo Comparison (rAAPL vs rNVDA)");
  const demoCompBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Load Demo Comparison") || b.textContent?.includes("Load demo pair"));
  });
  if (demoCompBtn.asElement()) {
    await demoCompBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Scroll to comparison table
  await page.evaluate(() => {
    const tables = document.querySelectorAll("table");
    if (tables.length > 0) {
      tables[tables.length - 1].scrollIntoView({ behavior: "instant", block: "center" });
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_07_multi_symbol_demo_comparison.png") });

  // 9. Mobile Viewport Check (390x844)
  console.log("9. Testing mobile viewport (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_08_mobile_orientation.png") });

  // Scroll to comparison on mobile
  await page.evaluate(() => {
    const tables = document.querySelectorAll("table");
    if (tables.length > 0) {
      tables[tables.length - 1].scrollIntoView({ behavior: "instant", block: "center" });
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "m11_09_mobile_comparison.png") });

  await browser.close();
  console.log("=== BROWSER WALKTHROUGH COMPLETED SUCCESSFULLY ===");
}

runMilestone11Walkthrough().catch((err) => {
  console.error("Walkthrough failed:", err);
  process.exit(1);
});
