import express from "express";
import rateLimit from "express-rate-limit";
import { upsertMenu } from "../services/cache.js";
import { scrapeAllHalls } from "../services/scraper.js";

const router = express.Router();

const scrapeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", scrapeLimiter, async (_req, res) => {
  try {
    const data = await scrapeAllHalls();

    await Promise.all(
      data.menus
        .filter((menu) => !menu.scrapeError)
        .map((menu) => upsertMenu(menu.hall, menu))
    );

    return res.json({
      status: "ok",
      message: "Fresh scrape completed.",
      data,
    });
  } catch (error) {
    console.error("/scrape failed", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to refresh menu cache.",
      details: { error: error.message },
    });
  }
});

export default router;
