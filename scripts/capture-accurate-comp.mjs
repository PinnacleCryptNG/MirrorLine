import puppeteer from "puppeteer-core";
import path from "node:path";

const SCREENSHOTS_DIR = "/opt/cursor/artifacts/screenshots";

async function runAccurateComparison() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1280,1200"],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Add comparison symbols: "+ rAAPL", "+ rNVDA"
  console.log("Adding + rAAPL and + rNVDA");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b1 = btns.find((b) => b.innerText === "+ rAAPL");
    const b2 = btns.find((b) => b.innerText === "+ rNVDA");
    if (b1) b1.click();
    if (b2) b2.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 2. Click "Load snapshots"
  console.log("Clicking Load snapshots");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((b) => b.innerText === "Load snapshots");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 4500));

  // 3. Add shared claim in comparison section (which is the SECOND "+ 24-hour price change" button on the page)
  console.log("Adding shared claim");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(
      (b) => b.innerText === "+ 24-hour price change"
    );
    // Index 1 is in the multi-symbol comparison section
    if (btns[1]) btns[1].click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 4. Click "Run comparison"
  console.log("Clicking Run comparison");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((b) => b.innerText === "Run comparison");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // 5. Check if comparison card is rendered
  const compCard = await page.evaluateHandle(() => {
    const headings = Array.from(document.querySelectorAll("h3"));
    const compHeading = headings.find((h) => h.innerText === "Comparison table");
    return compHeading ? compHeading.closest("div.rounded-xl") : null;
  });

  if (compCard.asElement()) {
    console.log("SUCCESS: Found comparison card! Capturing screenshot...");
    await compCard.asElement().screenshot({ path: path.join(SCREENSHOTS_DIR, "14_comparison_table_success.png") });
  } else {
    console.log("FAILED to find comparison card");
    const errors = await page.$$eval(".text-\\[\\#FF6B7A\\]", (els) => els.map((e) => e.innerText));
    console.log("Visible errors on page:", errors);
  }

  await browser.close();
}

runAccurateComparison().catch(console.error);
