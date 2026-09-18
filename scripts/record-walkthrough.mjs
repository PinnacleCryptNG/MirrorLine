import puppeteer from "puppeteer-core";

async function runRecordedDemo() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: false,
    defaultViewport: { width: 1280, height: 850 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,850",
      "--window-position=0,0",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // 1. Navigate to Mirrorline
  await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Toggle orientation guide
  const toggleBtn = await page.$('button[aria-label="Collapse orientation guide"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    const expandBtn = await page.$('button[aria-label="Expand orientation guide"]');
    if (expandBtn) {
      await expandBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // 3. Switch to Demo Fixture Mode
  const modeBtn = await page.$('button[aria-label="Switch to reproducible demo fixture mode"]');
  if (modeBtn) {
    await modeBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 4. Click rNVDA demo scenario
  const nvdaBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rNVDA · Overnight") || b.textContent?.includes("rNVDA · Post-Close"));
  });
  if (nvdaBtn.asElement()) {
    await nvdaBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 5. Click rTSLA demo scenario
  const tslaBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rTSLA · Weekend"));
  });
  if (tslaBtn.asElement()) {
    await tslaBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 6. Click rAAPL demo scenario
  const aaplBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("rAAPL · Regular"));
  });
  if (aaplBtn.asElement()) {
    await aaplBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 7. Scroll down to Investigation Report Preview
  const previewReportBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Preview report"));
  });
  if (previewReportBtn.asElement()) {
    await previewReportBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate(() => {
      const el = document.querySelector(".report-print-root");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 8. Load Demo Comparison (rAAPL vs rNVDA)
  const demoCompBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.textContent?.includes("Load Demo Comparison") || b.textContent?.includes("Load demo pair"));
  });
  if (demoCompBtn.asElement()) {
    await demoCompBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 2500));
  }

  // 9. Scroll to comparison table
  await page.evaluate(() => {
    const tables = document.querySelectorAll("table");
    if (tables.length > 0) {
      tables[tables.length - 1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  await new Promise((r) => setTimeout(r, 3000));

  await browser.close();
}

runRecordedDemo().catch((err) => {
  console.error("Recording demo failed:", err);
  process.exit(1);
});
