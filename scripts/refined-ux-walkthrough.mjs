import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runRefinedUXWalkthrough() {
  console.log("=== REFINED MIRRORLINE TRADING INVESTIGATION DESK WALKTHROUGH ===");

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

  // 1. Initial Page Load (Clean Ready State - No unsolicited API call)
  console.log("1. Navigating to Desk (Desktop 1280x950)");
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_01_ready_entry_state.png") });

  // 2. Open 'How it works' Modal
  console.log("2. Opening 'How it works' modal");
  const helpBtn = await page.$('button[aria-label="How Mirrorline works and judge walkthrough"]');
  if (helpBtn) {
    await helpBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_02_help_modal_principles.png") });

    // Switch to Evaluator Walkthrough tab
    const evaluatorTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("3–5 Min Evaluator Walkthrough"));
    });
    if (evaluatorTabBtn.asElement()) {
      await evaluatorTabBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_03_help_modal_walkthrough.png") });
    }

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close help guide"]');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 3. Load Demo Fixture (rAAPL Down)
  console.log("3. Loading Demo Scenario: rAAPL Regular Session Down");
  const tryDemoBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Try Demo Fixture") || b.textContent?.includes("Try Demo"));
  });
  if (tryDemoBtn.asElement()) {
    await tryDemoBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_04_overview_tab_loaded.png") });
  }

  // 4. Test Progressive Disclosure (Expand Technical Evidence Pack)
  console.log("4. Expanding Technical Auditability section");
  const techDetails = await page.evaluateHandle(() => {
    const summaries = Array.from(document.querySelectorAll("summary"));
    return summaries.find((s) => s.textContent?.includes("TECHNICAL AUDITABILITY"));
  });
  if (techDetails.asElement()) {
    await techDetails.asElement().click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_05_progressive_disclosure_expanded.png") });
    // Collapse it back to keep workspace tidy
    await techDetails.asElement().click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // 5. Navigate to Claims & Challenge Tab
  console.log("5. Navigating to Claims & Challenge Tab");
  const challengeTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("nav button"));
    return buttons.find((b) => b.textContent?.includes("Claims & Challenge"));
  });
  if (challengeTabBtn.asElement()) {
    await challengeTabBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_06_claims_tab.png") });
  }

  // 6. Navigate to Multi-Symbol Compare Tab
  console.log("6. Navigating to Multi-Symbol Compare Tab");
  const compareTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("nav button"));
    return buttons.find((b) => b.textContent?.includes("Compare Symbols"));
  });
  if (compareTabBtn.asElement()) {
    await compareTabBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 600));

    // Click Load Demo Comparison (rAAPL vs rNVDA)
    const loadDemoCompBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Load Demo Comparison"));
    });
    if (loadDemoCompBtn.asElement()) {
      await loadDemoCompBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 2000));
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_07_compare_tab_loaded.png") });
  }

  // 7. Navigate to Export Report Tab
  console.log("7. Navigating to Export Report Tab");
  const exportTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("nav button"));
    return buttons.find((b) => b.textContent?.includes("Export Report"));
  });
  if (exportTabBtn.asElement()) {
    await exportTabBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 600));

    const previewBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Preview report"));
    });
    if (previewBtn.asElement()) {
      await previewBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 600));
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_08_export_tab_preview.png") });
  }

  // 8. Mobile Viewport Check (390x844)
  console.log("8. Testing mobile viewport (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_09_mobile_workspace.png") });

  await browser.close();
  console.log("=== REFINED UX WALKTHROUGH COMPLETED SUCCESSFULLY ===");
}

runRefinedUXWalkthrough().catch((err) => {
  console.error("Walkthrough failed:", err);
  process.exit(1);
});
