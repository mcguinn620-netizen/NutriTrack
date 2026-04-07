import { chromium } from "playwright";
import { parseDiningHalls, parseHiddenFields, parseMenu } from "./parser.js";

const DEFAULT_BASE_URL = process.env.NETNUTRITION_URL || "https://netnutrition.byu.edu/NetNutrition/1";
const HALL_PARAM_NAME = process.env.NETNUTRITION_HALL_PARAM || "cboUnit";

async function withPage(callback) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(DEFAULT_BASE_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
    return await callback(page);
  } finally {
    await browser.close();
  }
}

function toFormPayload(hiddenFields, hallId) {
  return {
    ...hiddenFields,
    [HALL_PARAM_NAME]: hallId,
    __EVENTTARGET: HALL_PARAM_NAME,
    __EVENTARGUMENT: "",
  };
}

async function submitHallSelection(page, hall) {
  const initialHtml = await page.content();
  const hiddenFields = parseHiddenFields(initialHtml);

  const payload = toFormPayload(hiddenFields, hall.id);
  const response = await page.request.post(DEFAULT_BASE_URL, {
    form: payload,
    timeout: 45_000,
  });

  if (!response.ok()) {
    throw new Error(`NetNutrition returned ${response.status()} for hall ${hall.name}`);
  }

  return response.text();
}

export async function scrapeHalls() {
  return withPage(async (page) => {
    const html = await page.content();
    const halls = parseDiningHalls(html);

    if (halls.length === 0) {
      throw new Error("No dining halls found in NetNutrition response.");
    }

    return halls;
  });
}

export async function scrapeHallMenu(hall) {
  return withPage(async (page) => {
    const hallHtml = await submitHallSelection(page, hall);
    return parseMenu(hallHtml, hall.name);
  });
}

export async function scrapeAllHalls() {
  const halls = await scrapeHalls();
  const results = [];

  for (const hall of halls) {
    try {
      const menu = await scrapeHallMenu(hall);
      results.push(menu);
    } catch (error) {
      results.push({
        hall: hall.name,
        categories: [],
        items: [],
        scrapeError: error.message,
      });
    }
  }

  return {
    halls,
    menus: results,
    scrapedAt: new Date().toISOString(),
  };
}
