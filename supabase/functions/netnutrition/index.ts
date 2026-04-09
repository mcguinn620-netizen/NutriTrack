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

function appendCookies(cookieJar: string[], response: Response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;

  const cookiePair = setCookie.split(";")[0];
  const cookieName = cookiePair.split("=")[0];
  const existingIndex = cookieJar.findIndex((cookie) =>
    cookie.startsWith(`${cookieName}=`)
  );

  if (existingIndex >= 0) {
    cookieJar[existingIndex] = cookiePair;
    return;
  }

  cookieJar.push(cookiePair);
}

function extractAjaxUpdatePanelHtml(ajaxResponse: string): string {
  const marker = "|updatePanel|ContentPlaceHolder1_updPnl|";
  const startIndex = ajaxResponse.indexOf(marker);

  if (startIndex === -1) {
    console.log(
      `[netnutrition] ajax parse failed (missing updatePanel marker): ${ajaxResponse.slice(0, 500)}`
    );
    throw new Error("Failed to parse AJAX updatePanel response");
  }

  const startOfPanelHtml = startIndex + marker.length;
  const tail = ajaxResponse.slice(startOfPanelHtml);
  const endMarkers = [
    "|hiddenField|",
    "|asyncPostBackControlIDs|",
    "|postBackControlIDs|",
    "|scriptBlock|",
    "|scriptStartupBlock|",
    "|expando|",
    "|onSubmit|",
    "|pageTitle|",
    "|focus|",
    "|updatePanel|",
  ];

  let endIndex = -1;
  for (const markerName of endMarkers) {
    const markerIndex = tail.indexOf(markerName);
    if (markerIndex !== -1 && (endIndex === -1 || markerIndex < endIndex)) {
      endIndex = markerIndex;
    }
  }

  if (endIndex === -1) {
    console.log(
      `[netnutrition] ajax parse failed (missing panel end marker): ${ajaxResponse.slice(0, 500)}`
    );
    throw new Error("Failed to parse AJAX updatePanel response");
  }

  return tail.slice(0, endIndex);
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

    appendCookies(cookieJar, res1);

    // STEP 2 — CRITICAL FIRST AJAX ACTION (load units)
    const body2 = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$UnitList",
      __EVENTARGUMENT: "0",
      __VIEWSTATE: hidden1.__VIEWSTATE,
      __VIEWSTATEGENERATOR: hidden1.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION: hidden1.__EVENTVALIDATION,
    });

    const res2 = await fetch(`${BASE}/Unit/SelectUnitFromSideBar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieJar.join("; "),
      },
      body: body2,
    });

    appendCookies(cookieJar, res2);
    const ajaxResponse = await res2.text();
    const ajaxPanelHtml = extractAjaxUpdatePanelHtml(ajaxResponse);

    const units = parseEntitiesByDataAttribute(ajaxPanelHtml, "unitid");
    console.log(`[netnutrition] units found: ${units.length}`);
    ensureStepHasResults("parse units", units.length);

    // STEP 3 — Select first unit using same endpoint
    const unitId = units[0].id;
    const hiddenAfterAjax = extractHidden(ajaxPanelHtml);
    const body3 = new URLSearchParams({
      __EVENTTARGET: "ctl00$ContentPlaceHolder1$UnitList",
      __EVENTARGUMENT: unitId,
      __VIEWSTATE: hiddenAfterAjax.__VIEWSTATE || hidden1.__VIEWSTATE,
      __VIEWSTATEGENERATOR:
        hiddenAfterAjax.__VIEWSTATEGENERATOR || hidden1.__VIEWSTATEGENERATOR,
      __EVENTVALIDATION:
        hiddenAfterAjax.__EVENTVALIDATION || hidden1.__EVENTVALIDATION,
    });

    const res3 = await fetch(`${BASE}/Unit/SelectUnitFromSideBar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieJar.join("; "),
      },
      body: body3,
    });
    appendCookies(cookieJar, res3);

    return new Response(
      JSON.stringify({
        units,
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
