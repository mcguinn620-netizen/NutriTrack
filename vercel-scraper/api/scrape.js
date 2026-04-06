import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    const browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle" });

    console.log("Page loaded");

    const data = await page.evaluate(() => {

      function getText(el) {
        return el?.textContent?.trim() || "";
      }

      const units = [];

      document.querySelectorAll("[id*='UnitsList'] a").forEach(unitEl => {
        units.push({
          name: getText(unitEl),
          id: unitEl.getAttribute("data-oid"),
          menus: []
        });
      });

      return { units };
    });

    await browser.close();

    return res.status(200).json(data);

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
