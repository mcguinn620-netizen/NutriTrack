// scraper-render/index.js
import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 9999;

// Utility function to parse NetNutrition table rows
async function parseNetNutrition(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for table to load
    await page.waitForSelector('table#foodItems', { timeout: 10000 });

    // Extract table data
    const data = await page.$$eval('table#foodItems tbody tr', rows =>
      rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          name: cells[0]?.innerText.trim() || null,
          calories: cells[1]?.innerText.trim() || null,
          protein: cells[2]?.innerText.trim() || null,
          carbs: cells[3]?.innerText.trim() || null,
          fat: cells[4]?.innerText.trim() || null,
        };
      })
    );

    await browser.close();
    return data;
  } catch (err) {
    await browser.close();
    console.error('Error parsing NetNutrition:', err);
    throw err;
  }
}

// Endpoint for Supabase to call
app.get('/netnutrition', async (req, res) => {
  try {
    const url = 'http://netnutrition.bsu.edu/NetNutrition/1';
    const items = await parseNetNutrition(url);

    res.json({
      status: 'ok',
      count: items.length,
      data: items,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Scraper failed',
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`NetNutrition scraper running on port ${PORT}`);
});