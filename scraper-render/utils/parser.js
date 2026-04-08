import { chromium } from "playwright";

export async function scrapeNetNutrition() {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    const page = await context.newPage();

    // Block heavy resources (faster + prevents timeout)
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const url = "https://netnutrition.bsu.edu/NetNutrition/1#";

    // 🔥 CRITICAL FIX: robust navigation
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 90000
      });
    } catch (err) {
      console.log("[goto retry] first attempt failed:", err.message);

      await page.waitForTimeout(5000);

      await page.goto(url, {
        waitUntil: "load",
        timeout: 90000
      });
    }

    // Ensure page actually loaded something
    await page.waitForTimeout(3000);

    const html = await page.content();

    return {
      success: true,
      length: html.length,
      message: "Page loaded successfully"
    };

  } catch (error) {
    console.error("[scrape error]", error);

    return {
      success: false,
      error: "Failed to load NetNutrition data",
      details: error.message,
      at: new Date().toISOString()
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}