import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runRefinedUXWalkthrough() {
  console.log("=== BEGINNER-FIRST MIRRORLINE DESK WALKTHROUGH ===");

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

  // 1. Initial Page Load (Light / Champagne beginner-first Homepage)
  console.log("1. Navigating to Desk (Light Champagne initial experience)");
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_01_light_hero_homepage.png") });

  // 2. Toggle Theme (Switch to Dark mode, then back to Light)
  console.log("2. Testing theme toggle (Dark then Light)");
  const themeToggle = await page.$('button[aria-label="Switch to dark mode"]');
  if (themeToggle) {
    await themeToggle.click();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_02_dark_mode_homepage.png") });

    // Switch back to light
    const lightToggle = await page.$('button[aria-label="Switch to light mode"]');
    if (lightToggle) {
      await lightToggle.click();
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 3. Open 'How it works' Modal
  console.log("3. Opening 'How it works' modal");
  const helpBtn = await page.$('button[aria-label="How Mirrorline works and evaluator guide"]');
  if (helpBtn) {
    await helpBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_03_help_modal_principles.png") });

    // Switch to Evaluator Walkthrough tab
    const evaluatorTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("3–5 Min Evaluator Walkthrough"));
    });
    if (evaluatorTabBtn.asElement()) {
      await evaluatorTabBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_04_help_modal_walkthrough.png") });
    }

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close help guide"]');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 4. Load Demo Scenario: rAAPL Regular Session Down
  console.log("4. Loading Demo Scenario: rAAPL Regular Session Down");
  const tryDemoBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Try the 60-second demo") || b.textContent?.includes("Try Demo"));
  });
  if (tryDemoBtn.asElement()) {
    await tryDemoBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_05_overview_tab_loaded.png") });
  }

  // 5. Test Progressive Disclosure (Expand Technical Auditability)
  console.log("5. Expanding Technical Auditability section");
  const techDetails = await page.evaluateHandle(() => {
    const summaries = Array.from(document.querySelectorAll("summary"));
    return summaries.find((s) => s.textContent?.includes("TECHNICAL AUDITABILITY"));
  });
  if (techDetails.asElement()) {
    await techDetails.asElement().click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_06_progressive_disclosure_expanded.png") });
    // Collapse back
    await techDetails.asElement().click();
    await new Promise((r) => setTimeout(r, 400));
  }

  // 6. Navigate to Test My Idea (Claims) Tab
  console.log("6. Navigating to Test My Idea Tab");
  const challengeTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("nav button"));
    return buttons.find((b) => b.textContent?.includes("Test My Idea") || b.textContent?.includes("Claims"));
  });
  if (challengeTabBtn.asElement()) {
    await challengeTabBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 600));

    // Add a price direction claim and test it
    const addPriceBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Price direction"));
    });
    if (addPriceBtn.asElement()) {
      await addPriceBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 400));

      const runBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((b) => b.textContent?.includes("Test my own idea against this data"));
      });
      if (runBtn.asElement()) {
        await runBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_07_test_my_idea_results.png") });
  }

  // 7. Navigate to Multi-Symbol Compare Tab
  console.log("7. Navigating to Multi-Symbol Compare Tab");
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
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_08_compare_tab_loaded.png") });
  }

  // 8. Navigate to Export Report Tab
  console.log("8. Navigating to Export Report Tab");
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
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_09_export_tab_preview.png") });
  }

  // 9. Mobile Viewport Check (390x844)
  console.log("9. Testing mobile viewport (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ux_10_mobile_workspace.png") });

  await browser.close();
  console.log("=== BEGINNER-FIRST UX WALKTHROUGH COMPLETED SUCCESSFULLY ===");
}

runRefinedUXWalkthrough().catch((err) => {
  console.error("Walkthrough failed:", err);
  process.exit(1);
});
