import "dotenv/config";
import cors from "cors";
import express from "express";
import hallsRoute from "./routes/halls.js";
import menuRoute from "./routes/menu.js";
import scrapeRoute from "./routes/scrape.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.use("/halls", hallsRoute);
app.use("/menu", menuRoute);
app.use("/scrape", scrapeRoute);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({
    status: "error",
    message: "Unexpected server error.",
    details: { error: err.message },
  });
});

const port = Number(process.env.PORT) || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`NutriTrack backend listening on 0.0.0.0:${port}`);
});
