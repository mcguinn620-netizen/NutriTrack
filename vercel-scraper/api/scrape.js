import { chromium } from "playwright";

const DEFAULT_TIMEOUT_MS = 30000;

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeNutritionKey(key) {
  return cleanText(key).replace(/:$/, "");
}

async function collectLinks(page, selector, fallbackSelector = null) {
  const links = await page.$$eval(selector, (nodes) =>
    nodes
      .map((node) => {
        const el = /** @type {HTMLElement} */ (node);
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const oid =
          el.getAttribute("data-oid") ||
          el.dataset?.oid ||
          el.getAttribute("data-id") ||
          "";
        const id = el.id || "";
        return text ? { text, oid, id } : null;
      })
      .filter(Boolean),
  );

  if (links.length || !fallbackSelector) return links;

  return page.$$eval(fallbackSelector, (nodes) =>
    nodes
      .map((node) => {
        const el = /** @type {HTMLElement} */ (node);
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const oid =
          el.getAttribute("data-oid") ||
          el.dataset?.oid ||
          el.getAttribute("data-id") ||
          "";
        const id = el.id || "";
        return text ? { text, oid, id } : null;
      })
      .filter(Boolean),
  );
}

async function clickByLabel(page, label, selectors) {
  const escaped = label.replace(/"/g, '\\"');

  for (const selector of selectors) {
    const found = await page.$(`${selector} >> text="${escaped}"`);
    if (!found) continue;
    await found.click();
    return true;
  }

  return false;
}

async function extractItemTraits(page) {
  const selectors = [
    "[id*='Trait'] li",
    "[id*='Trait'] a",
    ".cbo_nn_itemTraits li",
    ".cbo_nn_itemTraits a",
  ];

  for (const selector of selectors) {
    const traits = await page
      .$$eval(selector, (nodes) =>
        nodes
          .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
          .filter(Boolean),
      )
      .catch(() => []);

    if (traits.length) return [...new Set(traits)];
  }

  return [];
}

async function extractNutrition(page) {
  const selectors = [
    "#nutritionLabel tr",
    "[id*='NutritionLabel'] tr",
    "[id*='nutritionLabel'] tr",
    "[id*='NutritionGrid'] tr",
    ".nutritionTable tr",
  ];

  for (const selector of selectors) {
    const rows = await page
      .$$eval(selector, (nodes) =>
        nodes
          .map((row) => {
            const cells = Array.from(row.querySelectorAll("th, td"))
              .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
              .filter(Boolean);
            if (cells.length < 2) return null;
            return [cells[0], cells[cells.length - 1]];
          })
          .filter(Boolean),
      )
      .catch(() => []);

    if (!rows.length) continue;

    const nutrition = {};
    for (const [key, value] of rows) {
      const normalizedKey = normalizeNutritionKey(key);
      if (!normalizedKey) continue;
      nutrition[normalizedKey] = cleanText(value);
    }

    if (Object.keys(nutrition).length) return nutrition;
  }

  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const sourceUrl = req.body?.url;

  if (!sourceUrl) {
    return res.status(400).json({ error: "Missing url" });
  }

  let browser;

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    await page.goto(sourceUrl, { waitUntil: "networkidle" });

    console.log("Loaded page", sourceUrl);

    const unitsOnPage = await collectLinks(
      page,
      "[id*='UnitsList'] a, [id*='Unit'] a[data-oid]",
      "a[data-oid]",
    );

    const units = [];

    for (const unit of unitsOnPage) {
      const unitClicked = await clickByLabel(page, unit.text, [
        "[id*='UnitsList'] a",
        "[id*='Unit'] a",
        "a",
      ]);

      if (!unitClicked) continue;

      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(300);

      const menuLinks = await collectLinks(
        page,
        "[id*='MenuList'] a, [id*='menuList'] a",
        "a[data-oid]",
      );

      const menus = [];

      for (const menu of menuLinks) {
        const menuClicked = await clickByLabel(page, menu.text, [
          "[id*='MenuList'] a",
          "[id*='menuList'] a",
          "a",
        ]);

        if (!menuClicked) continue;

        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(250);

        const itemLinks = await collectLinks(
          page,
          "[id*='Item'] a, [id*='CourseItems'] a, [id*='menuDetailGrid'] a",
          "a[data-oid]",
        );

        const items = [];

        for (const item of itemLinks) {
          const itemClicked = await clickByLabel(page, item.text, [
            "[id*='Item'] a",
            "[id*='CourseItems'] a",
            "[id*='menuDetailGrid'] a",
            "a",
          ]);

          if (!itemClicked) continue;

          await page.waitForLoadState("networkidle").catch(() => {});
          await page.waitForTimeout(250);

          const traits = await extractItemTraits(page);
          const nutrition = await extractNutrition(page);

          items.push({
            name: item.text,
            traits,
            nutrition,
          });
        }

        menus.push({
          name: menu.text,
          items,
        });
      }

      units.push({
        name: unit.text,
        menus,
      });
    }

    return res.status(200).json({ units });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SCRAPER ERROR:", message, err);
    return res.status(500).json({ error: message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
