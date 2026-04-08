import express from "express";
import { scrapeNetNutrition } from "./utils/parser.js";

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "nutritrack-scraper",
    timestamp: new Date().toISOString(),
  });
});

app.get("/netnutrition", async (_req, res) => {
  const data = await scrapeNetNutrition();
  res.json(data);
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
