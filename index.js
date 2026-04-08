import express from "express";
import { scrapeNetNutrition } from "./utils/parser.js";

const app = express();
app.use(express.json());

let cache = { data: null, updatedAt: null };

app.get("/health", (req, res) => {
  res.json({ status: "ok", updatedAt: cache.updatedAt });
});

app.get("/netnutrition", async (req, res) => {
  if (cache.data) {
    return res.json({
      fromCache: true,
      updatedAt: cache.updatedAt,
      data: cache.data
    });
  }

  const result = await scrapeNetNutrition();

  if (result.success) {
    cache = { data: result, updatedAt: result.timestamp };
    res.json({ fromCache: false, data: result });
  } else {
    res.status(503).json(result);
  }
});

app.post("/refresh", async (req, res) => {
  const result = await scrapeNetNutrition();

  if (result.success) {
    cache = { data: result, updatedAt: result.timestamp };
    res.json({ refreshed: true, updatedAt: result.timestamp });
  } else {
    res.status(503).json(result);
  }
});

app.listen(process.env.PORT || 10000);
