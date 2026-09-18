import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runQA() {
  console.log("=== STARTING BROWSER QA ===");
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,900",
    ],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => pageErrors.push(err.toString()));

  // 1. Initial Load & Desktop Viewport
  console.log("Step 1: Navigating to http://127.0.0.1:43123");
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2", timeout: 30000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_initial_desktop.png") });

  const pageTitle = await page.title();
  const headerText = await page.$eval("header", (el) => el.innerText);
  console.log("Page Title:", pageTitle);
  console.log("Header text snippet:", headerText.slice(0, 150));

  // Mobile Viewport Check
  console.log("Step 1b: Checking mobile viewport (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_mobile_viewport.png") });
  await page.setViewport({ width: 1280, height: 900 });

  // 2. Single-Symbol Snapshot
  console.log("Step 2: Checking initial rAAPL snapshot and loading new if needed");
  const stats = await page.$$eval("section.grid > div", (els) =>
    els.map((el) => el.innerText.replace(/\n+/g, " | "))
  );
  console.log("Initial Stats:", stats);

  // Try invalid symbol "!!!"
  console.log("Step 2b: Testing invalid symbol '!!!'");
  const symbolInput = await page.$('input[aria-label="rToken symbol"]');
  await symbolInput.click({ clickCount: 3 });
  await symbolInput.type("!!!");
  await page.click('button[type="submit"]');
  await page.waitForNetworkIdle({ timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03_invalid_symbol_error.png") });
  const errorText = await page.evaluate(() => {
    const el = document.querySelector(".text-\\[\\#FF6B7A\\]");
    return el ? el.innerText : "no error element found";
  });
  console.log("Invalid symbol error message:", errorText);

  // Load valid symbol rAAPL again
  console.log("Step 2c: Loading valid symbol rAAPL");
  await symbolInput.click({ clickCount: 3 });
  await symbolInput.type("rAAPL");
  await page.click('button[type="submit"]');
  await page.waitForNetworkIdle({ timeout: 15000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04_raapl_loaded.png") });

  // 3. Structured claims + Challenge
  console.log("Step 3: Adding structured claims and running challenge");
  // Find Structured claim composer buttons
  const composerButtons = await page.$$eval("button", (buttons) =>
    buttons.map((b) => b.innerText).filter((t) => t.startsWith("+ "))
  );
  console.log("Available add buttons:", composerButtons);

  // Click "+ 24-hour change"
  const priceChangeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText.includes("24-hour change"));
  });
  if (priceChangeBtn.asElement()) {
    await priceChangeBtn.asElement().click();
  }

  // Click "+ News catalyst"
  const newsBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText.includes("News catalyst"));
  });
  if (newsBtn.asElement()) {
    await newsBtn.asElement().click();
  }

  // Run challenge
  console.log("Clicking 'Run challenge'");
  const runChallengeBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Run challenge");
  });
  if (runChallengeBtn.asElement()) {
    await runChallengeBtn.asElement().click();
    await page.waitForNetworkIdle({ timeout: 5000 });
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05_challenge_results.png") });

  const challengeSummary = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll("div")).filter((d) =>
      ["Supported", "Challenged", "Unsupported", "Unassessed"].some((s) => d.innerText.includes(s))
    );
    return chips.map((c) => c.innerText.replace(/\n+/g, " "));
  });
  console.log("Challenge summary chips:", challengeSummary);

  // 4. Revise claims
  console.log("Step 4: Revising claims and diffing");
  // Edit the 24h change select from "down" to "up"
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select"));
    if (selects.length > 0) {
      selects[0].value = "up";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  const reviseBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Revise and re-challenge");
  });
  if (reviseBtn.asElement()) {
    await reviseBtn.asElement().click();
    await page.waitForNetworkIdle({ timeout: 5000 });
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06_revision_diff.png") });

  // 5. Investigation Report Preview and Export
  console.log("Step 5: Previewing investigation report");
  const previewReportBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Preview report");
  });
  if (previewReportBtn.asElement()) {
    await previewReportBtn.asElement().click();
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07_report_preview.png") });

  // Test report print button
  const reportPrintBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Print / save as PDF");
  });
  console.log("Found report print button:", Boolean(reportPrintBtn.asElement()));

  // 6. Multi-Symbol Comparison
  console.log("Step 6: Multi-symbol comparison");
  // Test duplicate symbol
  const addCompareInput = await page.$('input[aria-label="Add comparison rToken"]');
  await addCompareInput.type("rAAPL");
  const addSymbolBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Add symbol");
  });
  await addSymbolBtn.asElement().click();
  // Try adding rAAPL again
  await addCompareInput.click({ clickCount: 3 });
  await addCompareInput.type("rAAPL");
  await addSymbolBtn.asElement().click();
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08_duplicate_symbol_error.png") });

  // Add rNVDA
  await addCompareInput.click({ clickCount: 3 });
  await addCompareInput.type("rNVDA");
  await addSymbolBtn.asElement().click();

  // Add rTSLA
  await addCompareInput.click({ clickCount: 3 });
  await addCompareInput.type("rTSLA");
  await addSymbolBtn.asElement().click();

  // Click Load snapshots
  console.log("Clicking 'Load snapshots'");
  const loadSnapshotsBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Load snapshots");
  });
  await loadSnapshotsBtn.asElement().click();
  await page.waitForNetworkIdle({ timeout: 25000 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09_snapshots_loaded.png") });

  // In Multi-symbol composer, add a shared claim
  console.log("Adding shared claims to comparison");
  const comparePriceChangeBtn = await page.evaluateHandle(() => {
    const headings = Array.from(document.querySelectorAll("p"));
    const sharedSection = headings.find((h) => h.innerText === "SHARED CLAIMS");
    if (!sharedSection) return null;
    const container = sharedSection.closest("div.rounded-xl");
    const btns = Array.from(container.querySelectorAll("button"));
    return btns.find((b) => b.innerText.includes("24-hour change"));
  });
  if (comparePriceChangeBtn.asElement()) {
    await comparePriceChangeBtn.asElement().click();
  }

  // Click Run comparison
  console.log("Clicking 'Run comparison'");
  const runComparisonBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.innerText === "Run comparison");
  });
  if (runComparisonBtn.asElement()) {
    await runComparisonBtn.asElement().click();
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10_comparison_table.png") });

  console.log("Console logs recorded:", consoleLogs.length);
  if (pageErrors.length > 0) {
    console.error("Page errors:", pageErrors);
  } else {
    console.log("Zero unhandled page errors!");
  }

  await browser.close();
  console.log("=== BROWSER QA FINISHED ===");
}

runQA().catch((err) => {
  console.error("QA failed with error:", err);
  process.exit(1);
});
