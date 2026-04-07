import express from "express";
import { listCachedHalls } from "../services/cache.js";
import { scrapeHalls } from "../services/scraper.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const cachedHalls = await listCachedHalls();
    if (cachedHalls.length > 0) {
      return res.json({ status: "ok", source: "cache", halls: cachedHalls });
    }

    const scraped = await scrapeHalls();
    return res.json({
      status: "ok",
      source: "scrape",
      halls: scraped.map((hall) => hall.name),
      raw: scraped,
    });
  } catch (error) {
    console.error("/halls failed", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to list dining halls.",
      details: { error: error.message },
    });
  }
});

export default router;
