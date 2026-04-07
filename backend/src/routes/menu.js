import express from "express";
import { getCachedMenu, upsertMenu } from "../services/cache.js";
import { scrapeHallMenu } from "../services/scraper.js";

const router = express.Router();
const inflightByHall = new Map();

function errorResponse(res, message, details = {}, status = 500) {
  return res.status(status).json({ status: "error", message, details });
}

async function scrapeAndPersist(hall) {
  if (inflightByHall.has(hall)) {
    return inflightByHall.get(hall);
  }

  const work = (async () => {
    const menu = await scrapeHallMenu({ id: hall, name: hall });
    await upsertMenu(hall, menu);
    return menu;
  })();

  inflightByHall.set(hall, work);

  try {
    return await work;
  } finally {
    inflightByHall.delete(hall);
  }
}

router.get("/", async (req, res) => {
  const hall = req.query.hall?.toString().trim();

  if (!hall) {
    return errorResponse(res, "Query parameter 'hall' is required.", { query: req.query }, 400);
  }

  try {
    const cached = await getCachedMenu(hall);

    if (cached && !cached.isStale) {
      return res.json({
        status: "ok",
        source: "cache",
        hall,
        updatedAt: cached.updatedAt,
        data: cached.payload,
      });
    }

    const freshMenu = await scrapeAndPersist(hall);

    return res.json({
      status: "ok",
      source: "scrape",
      hall,
      updatedAt: new Date().toISOString(),
      data: freshMenu,
    });
  } catch (error) {
    console.error("/menu failed", error);
    return errorResponse(res, "Failed to load menu.", { hall, error: error.message });
  }
});

export default router;
