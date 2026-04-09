// Supabase Edge Function — NetNutrition ASP.NET POST Scraper
// Zero browser • Works with ViewState • Handles modal + session

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE = "http://netnutrition.bsu.edu/NetNutrition/1";

type ParsedEntity = {
  id: string;
  name: string;
};

// Helper: extract hidden ASP.NET fields
function extractHidden(html: string) {
  const get = (name: string) => {
    const match = html.match(
      new RegExp(`name=\"${name}\".*?value=\"([^\"]*)\"`, "i")
    );
    return match ? match[1] : "";
  };

  return {
    __VIEWSTATE: get("__VIEWSTATE"),
    __VIEWSTATEGENERATOR: get("__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: get("__EVENTVALIDATION"),
  };
}

function parseEntitiesByDataAttribute(
  html: string,
  attrName: "unitid" | "menuid" | "itemid"
): ParsedEntity[] {
  const results: ParsedEntity[] = [];
  const regex = new RegExp(
    `<[^>]*data-${attrName}=\"(\\d+)\"[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    "gi"
  );

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    results.push({
      id: match[1],
      name: match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
    });
  }

  return results;
}

function ensureStepHasResults(stepName: string, count: number) {
  if (count === 0) {
    throw new Error(`Step failed: ${stepName}`);
  }
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

    const units = parseEntitiesByDataAttribute(html1, "unitid");
    console.log(`[netnutrition] units found: ${units.length}`);
    ensureStepHasResults("parse units", units.length);

    const unitId = units[0].id;

    // STEP 2 — Select Unit (Dining Hall)
    const body2 = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$UnitList",
      __EVENTARGUMENT: unitId,
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

    let htmlAfterUnitSelection = await res2.text();
    let hiddenAfterUnitSelection = extractHidden(htmlAfterUnitSelection);

    // STEP 3 — Select First Child Unit (if exists)
    if (/childUnitsPanel/i.test(htmlAfterUnitSelection)) {
      const childUnits = parseEntitiesByDataAttribute(htmlAfterUnitSelection, "unitid");
      ensureStepHasResults("parse child units", childUnits.length);

      const childUnitId = childUnits[0].id;

      const body3 = new URLSearchParams({
        __EVENTTARGET: "ctl00$ContentPlaceHolder1$ChildUnitList",
        __EVENTARGUMENT: childUnitId,
        __VIEWSTATE: hiddenAfterUnitSelection.__VIEWSTATE,
        __VIEWSTATEGENERATOR: hiddenAfterUnitSelection.__VIEWSTATEGENERATOR,
        __EVENTVALIDATION: hiddenAfterUnitSelection.__EVENTVALIDATION,
      });

      const res3 = await fetch(`${BASE}/Unit/SelectUnitFromChildUnitsList`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieJar.join("; "),
        },
        body: body3,
      });

      htmlAfterUnitSelection = await res3.text();
      hiddenAfterUnitSelection = extractHidden(htmlAfterUnitSelection);
    }

    // STEP 4 — Parse menu IDs
    const menus = parseEntitiesByDataAttribute(htmlAfterUnitSelection, "menuid");
    console.log(`[netnutrition] menus found: ${menus.length}`);
    ensureStepHasResults("parse menus", menus.length);

    const menuId = menus[0].id;

    // STEP 5 — Select menu
    const bodyMenu = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$MenuList",
      __EVENTARGUMENT: menuId,
      __VIEWSTATE: hiddenAfterUnitSelection.__VIEWSTATE,
      __VIEWSTATEGENERATOR: hiddenAfterUnitSelection.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION: hiddenAfterUnitSelection.__EVENTVALIDATION,
    });

    const resMenu = await fetch(`${BASE}/Menu/SelectMenu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.join("; "),
      },
      body: bodyMenu,
    });

    const htmlMenu = await resMenu.text();

    // STEP 6 — Parse item IDs
    const items = parseEntitiesByDataAttribute(htmlMenu, "itemid");
    console.log(`[netnutrition] items found: ${items.length}`);
    ensureStepHasResults("parse items", items.length);

    // STEP 7 — Select item (required)
    const itemId = items[0].id;
    const bodySelectItem = new URLSearchParams({
      itemId,
    });

    await fetch(`${BASE}/Menu/SelectItem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.join("; "),
      },
      body: bodySelectItem,
    });

    // STEP 8 — Fetch nutrition
    const bodyNutrition = new URLSearchParams({
      itemId,
    });

    const resNutrition = await fetch(`${BASE}/NutritionDetail/ShowItemNutritionLabel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.join("; "),
      },
      body: bodyNutrition,
    });

    const nutrition = await resNutrition.text();

    return new Response(
      JSON.stringify({
        units,
        menus,
        items,
        nutrition,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});
