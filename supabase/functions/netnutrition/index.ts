// Supabase Edge Function — NetNutrition ASP.NET POST Scraper
// Zero browser • Works with ViewState • Handles modal + session

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE = "http://netnutrition.bsu.edu/NetNutrition/1";

// Helper: extract hidden ASP.NET fields
function extractHidden(html: string) {
  const get = (name: string) => {
    const match = html.match(
      new RegExp(`name="${name}".*?value="([^"]*)"`, "i")
    );
    return match ? match[1] : "";
  };

  return {
    __VIEWSTATE: get("__VIEWSTATE"),
    __VIEWSTATEGENERATOR: get("__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: get("__EVENTVALIDATION"),
  };
}

// Helper: parse items from HTML
function parseItems(html: string) {
  const items: any[] = [];
  const regex = /data-itemid="(\d+)".*?>(.*?)<\/a>/g;

  let match;
  while ((match = regex.exec(html))) {
    items.push({
      id: match[1],
      name: match[2].replace(/<[^>]+>/g, "").trim(),
    });
  }

  return items;
}

serve(async () => {
  try {
    const cookieJar: string[] = [];

    // STEP 1 — Initial GET (establish session + ViewState)
    const res1 = await fetch(BASE, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html1 = await res1.text();
    const hidden1 = extractHidden(html1);

    const setCookie = res1.headers.get("set-cookie");
    if (setCookie) cookieJar.push(setCookie.split(";")[0]);

    // STEP 2 — Select Unit (Dining Hall)
    const body2 = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$UnitList",
      __EVENTARGUMENT: "",
      __VIEWSTATE: hidden1.__VIEWSTATE,
      __VIEWSTATEGENERATOR: hidden1.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION: hidden1.__EVENTVALIDATION,
    });

    const res2 = await fetch(`${BASE}/Unit/SelectUnitFromSideBar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.join("; "),
      },
      body: body2,
    });

    const html2 = await res2.text();
    const hidden2 = extractHidden(html2);

    // STEP 3 — Select First Child Unit (if exists)
    const body3 = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$ChildUnitList",
      __VIEWSTATE: hidden2.__VIEWSTATE,
      __VIEWSTATEGENERATOR: hidden2.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION: hidden2.__EVENTVALIDATION,
    });

    const res3 = await fetch(`${BASE}/Unit/SelectUnitFromChildUnitsList`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.join("; "),
      },
      body: body3,
    });

    const html3 = await res3.text();

    // STEP 4 — Parse menu items
    const items = parseItems(html3);

    // STEP 5 — Fetch nutrition for first item (example)
    let nutrition = null;

    if (items.length > 0) {
      const itemId = items[0].id;

      const body4 = new URLSearchParams({
        itemId,
      });

      const res4 = await fetch(
        `${BASE}/NutritionDetail/ShowItemNutritionLabel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookieJar.join("; "),
          },
          body: body4,
        }
      );

      nutrition = await res4.text();
    }

    return new Response(
      JSON.stringify({
        success: true,
        items,
        sampleNutrition: nutrition,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { status: 500 }
    );
  }
});