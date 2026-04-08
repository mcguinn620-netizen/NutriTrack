import express from "express";
import { scrapeNetNutrition } from "./utils/parser.js";

const app = express();

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "NutriTrack Scraper",
    endpoints: ["/health", "/netnutrition"]
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/netnutrition", async (req, res) => {
  const data = await scrapeNetNutrition();
  res.json(data);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`NutriTrack Render scraper listening on :${PORT}`);
});