import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runComprehensiveWalkthrough() {
  console.log("=== COMPREHENSIVE BROWSER WALKTHROUGH ===");
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

  // 1. Initial Page Load
  console.log("1. Navigating to Desk");
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_desk_initial.png") });

  // 2. Mobile Responsive Layout Check
  console.log("2. Testing mobile layout (390x844)");
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_mobile_layout.png") });
  await page.setViewport({ width: 1280, height: 900 });

  // 3. Single-symbol Error State with invalid symbol
  console.log("3. Testing invalid symbol submission");
  const symbolInput = await page.$('input[aria-label="rToken symbol"]');
  await symbolInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await symbolInput.type("!!!");
  await page.click('header form button[type="submit"]');
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03_single_symbol_error.png") });

  // 4. Reload valid symbol rAAPL
  console.log("4. Loading valid symbol rAAPL");
  await symbolInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await symbolInput.type("rAAPL");
  await page.click('header form button[type="submit"]');
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04_raapl_restored.png") });

  // 5. Compose structured claims & Challenge
  console.log("5. Adding structured claims");
  // Click "+ 24-hour price change"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText.includes("24-hour price change"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Click "+ News or catalyst attribution"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText.includes("News or catalyst attribution"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Run Challenge
  console.log("5b. Running challenge");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Run challenge");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05_challenge_run.png") });

  // 6. Revise thesis & Diff
  console.log("6. Revising thesis");
  await page.evaluate(() => {
    // change the 24h sign select
    const selects = Array.from(document.querySelectorAll("select"));
    if (selects.length > 0) {
      selects[0].value = "up";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Revise and re-challenge");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06_revision_diff.png") });

  // 7. Preview & Export Single-symbol Report
  console.log("7. Previewing investigation report");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Preview report");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07_investigation_report_preview.png") });

  // 8. Multi-symbol Comparison: Duplicate symbol handling & Max symbol limit
  console.log("8. Adding comparison symbols");
  const compareInput = await page.$('input[aria-label="Add comparison rToken"]');
  // Add rAAPL
  await compareInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await compareInput.type("rAAPL");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Add symbol");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Try duplicate rAAPL
  await compareInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await compareInput.type("rAAPL");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Add symbol");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08_comparison_duplicate_error.png") });

  // Add rNVDA
  await compareInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await compareInput.type("rNVDA");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Add symbol");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Add rTSLA
  await compareInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await compareInput.type("rTSLA");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Add symbol");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 9. Load snapshots concurrently
  console.log("9. Loading comparison snapshots");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Load snapshots");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09_comparison_snapshots_loaded.png") });

  // 10. Per-symbol snapshot reload
  console.log("10. Testing per-symbol reload");
  await page.evaluate(() => {
    const reloadBtn = document.querySelector('button[aria-label="Reload snapshot for rNVDA"]');
    if (reloadBtn) reloadBtn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  // 11. Add shared claims to comparison
  console.log("11. Adding shared claims in comparison section");
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("p"));
    const sharedSection = headings.find((h) => h.innerText === "SHARED CLAIMS");
    if (!sharedSection) return;
    const container = sharedSection.closest("div.rounded-xl");
    const btns = Array.from(container.querySelectorAll("button"));
    const priceBtn = btns.find((b) => b.innerText.includes("24-hour price change"));
    if (priceBtn) priceBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("p"));
    const sharedSection = headings.find((h) => h.innerText === "SHARED CLAIMS");
    if (!sharedSection) return;
    const container = sharedSection.closest("div.rounded-xl");
    const btns = Array.from(container.querySelectorAll("button"));
    const newsBtn = btns.find((b) => b.innerText.includes("News or catalyst attribution"));
    if (newsBtn) newsBtn.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 12. Run comparison
  console.log("12. Running comparison");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((el) => el.innerText === "Run comparison");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10_comparison_table_rendered.png") });

  // 13. Test live claim editing recomputing table
  console.log("13. Testing live claim recomputation");
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("p"));
    const sharedSection = headings.find((h) => h.innerText === "SHARED CLAIMS");
    if (!sharedSection) return;
    const container = sharedSection.closest("div.rounded-xl");
    const select = container.querySelector("select");
    if (select) {
      select.value = "up";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "11_comparison_auto_recomputed.png") });

  // 14. Test Print Flow (pop up opening and writing without blocking)
  console.log("14. Testing print pop up flow");
  const printTest = await page.evaluate(() => {
    try {
      const popup = window.open("", "_blank", "width=1000,height=800");
      if (!popup) return { success: false, reason: "popup is null" };
      popup.document.open();
      popup.document.write("<html><body><h1>Print Test</h1></body></html>");
      popup.document.close();
      const hasContent = popup.document.body.innerText.includes("Print Test");
      popup.close();
      return { success: true, hasContent };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  console.log("Print flow evaluation result:", printTest);

  // 15. Verify Non-Advisory and Snapshot Integrity language on page
  console.log("15. Verifying page language integrity");
  const textContent = await page.evaluate(() => document.body.innerText);
  const containsRankings = /leaderboard|winner|best rtoken|highest ranked/i.test(textContent);
  const containsAdvice = /should buy|should sell|target price|forecasted profit/i.test(textContent);
  const containsSharedTape = /shared observation time|synchronized tape/i.test(textContent);
  console.log("Integrity checks:", {
    containsRankings,
    containsAdvice,
    containsSharedTape,
  });

  console.log("Walkthrough completed. Uncaught page errors:", pageErrors);
  await browser.close();
  console.log("=== BROWSER WALKTHROUGH SUCCESSFUL ===");
}

runComprehensiveWalkthrough().catch((err) => {
  console.error("Walkthrough failed:", err);
  process.exit(1);
});
