import express from "express";
import { scrapeNetNutrition } from "./utils/parser.js";

const app = express();
app.use(express.json());

let cache = { data: null, updatedAt: null };

app.get("/health", (_req, res) => {
  res.json({ status: "ok", updatedAt: cache.updatedAt });
});

app.get("/netnutrition", async (_req, res) => {
  try {
    const result = await scrapeNetNutrition();
    cache = { data: result, updatedAt: result.timestamp };
    return res.json({ fromCache: false, data: result, updatedAt: cache.updatedAt });
  } catch (err) {
    if (cache.data) {
      return res.json({
        fromCache: true,
        data: cache.data,
        updatedAt: cache.updatedAt,
        warning: "NetNutrition unreachable; returned cached data",
      });
    }

    return res.status(503).json({
      success: false,
      error: err.message,
    });
  }
});

app.post("/refresh", async (_req, res) => {
  try {
    const result = await scrapeNetNutrition();
    cache = { data: result, updatedAt: result.timestamp };
    return res.json({ refreshed: true, updatedAt: result.timestamp });
  } catch (err) {
    if (cache.data) {
      return res.status(503).json({
        refreshed: false,
        fromCache: true,
        updatedAt: cache.updatedAt,
        error: err.message,
      });
    }

    return res.status(503).json({
      refreshed: false,
      error: err.message,
    });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
