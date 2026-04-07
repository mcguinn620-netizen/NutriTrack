import express from "express";
import { chromium } from "playwright";
import { execSync } from "child_process";

// 🔥 FORCE INSTALL (fixes Render issue)
try {
  execSync("npx playwright install chromium", { stdio: "inherit" });
} catch (e) {
  console.log("Playwright install check:", e.message);
}

const app = express();
const PORT = process.env.PORT || 10000;

const BASE_URL = "http://netnutrition.bsu.edu/NetNutrition/1";

app.get("/", (req, res) => {
  res.send("NutriTrack Scraper Running");
});

app.get("/netnutrition", async (req, res) => {
  let browser;

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // =========================
    // STEP 1: GET DINING HALLS
    // =========================
    const halls = await page.$$eval("a", (links) =>
      links
        .filter((l) => l.textContent.trim().length > 0)
        .map((l) => ({
          text: l.textContent.trim(),
          id: l.getAttribute("id")
        }))
        .filter((l) => l.id && l.id.includes("Unit"))
    );

    const results = [];

    // =========================
    // STEP 2: LOOP HALLS
    // =========================
    for (const hall of halls.slice(0, 5)) {
      try {
        await page.click(`#${hall.id}`);
        await page.waitForLoadState("networkidle");

        // =========================
        // CHECK PANEL TYPE
        // =========================
        const hasChildUnits = await page.$("#childUnitsPanel");
        const hasMenu = await page.$("#menuPanel");

        let subUnits = [];

        // =========================
        // STEP 3A: CHILD UNITS
        // =========================
        if (hasChildUnits) {
          subUnits = await page.$$eval("#childUnitsPanel a", (links) =>
            links.map((l) => ({
              name: l.textContent.trim(),
              id: l.id
            }))
          );
        } else {
          subUnits = [{ name: hall.text, id: null }];
        }

        const menusData = [];

        // =========================
        // STEP 4: LOOP SUBUNITS
        // =========================
        for (const sub of subUnits.slice(0, 3)) {
          if (sub.id) {
            await page.click(`#${sub.id}`);
            await page.waitForLoadState("networkidle");
          }

          const menus = await page.$$eval("#menuPanel a", (links) =>
            links.map((l) => ({
              name: l.textContent.trim(),
              id: l.id
            }))
          );

          const menuResults = [];

          // =========================
          // STEP 5: LOOP MENUS
          // =========================
          for (const menu of menus.slice(0, 3)) {
            try {
              await page.click(`#${menu.id}`);
              await page.waitForLoadState("networkidle");

              // =========================
              // STEP 6: GET ITEMS
              // =========================
              const items = await page.$$eval(
                "#itemPanel a",
                (links) =>
                  links.map((l) => ({
                    name: l.textContent.trim()
                  }))
              );

              menuResults.push({
                menu: menu.name,
                items
              });

            } catch (err) {
              console.log("Menu error:", err.message);
            }
          }

          menusData.push({
            subUnit: sub.name,
            menus: menuResults
          });
        }

        results.push({
          hall: hall.text,
          data: menusData
        });

        // Go back to homepage
        await page.goto(BASE_URL, { waitUntil: "networkidle" });

      } catch (err) {
        console.log("Hall error:", err.message);
      }
    }

    res.json({
      status: "ok",
      count: results.length,
      data: results
    });

  } catch (err) {
    console.error("SCRAPER ERROR:", err);

    res.status(500).json({
      error: "Scraper failed",
      details: err.message
    });

  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});