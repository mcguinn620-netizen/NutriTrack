import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

const BASE = "https://netnutrition.bsu.edu/NetNutrition/1";

serve(async (req) => {
  try {
    // Allow GET + POST
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // STEP 1: Initial GET (session + cookies)
    const res1 = await fetch(BASE, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const cookies = res1.headers.get("set-cookie") || "";
    const html1 = await res1.text();

    const $ = load(html1);

    const viewstate = $("#__VIEWSTATE").val() as string;
    const eventvalidation = $("#__EVENTVALIDATION").val() as string;
    const viewstategen = $("#__VIEWSTATEGENERATOR").val() as string;

    if (!viewstate || !eventvalidation) {
      throw new Error("Missing ASP.NET hidden fields");
    }

    // STEP 2: Extract units
    const units: any[] = [];

    $("#cbo_nn_unitDataList a").each((_, el) => {
      const name = $(el).text().trim();
      const onclick = $(el).attr("onclick") || "";

      const match = onclick.match(/unitsSelectUnit\((\d+)\)/);

      if (match) {
        units.push({
          name,
          id: match[1],
        });
      }
    });

    if (units.length === 0) {
      throw new Error("No units found");
    }

    // STEP 3: POST (simulate unit click)
    const selected = units[0];

    const body = new URLSearchParams({
      "__EVENTTARGET": "units",
      "__EVENTARGUMENT": selected.id,
      "__VIEWSTATE": viewstate,
      "__EVENTVALIDATION": eventvalidation,
      "__VIEWSTATEGENERATOR": viewstategen,
    });

    const res2 = await fetch(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0",
      },
      body,
    });

    const html2 = await res2.text();

    if (html2.includes("Start-up Error")) {
      throw new Error("Session invalid / ASP.NET rejected request");
    }

    const $$ = load(html2);

    const panels = {
      childUnits: $$("#childUnitsPanel").attr("style") || null,
      courses: $$("#coursesPanel").attr("style") || null,
      items: $$("#itemPanel").attr("style") || null,
    };

    return new Response(
      JSON.stringify({
        success: true,
        units,
        selectedUnit: selected,
        panels,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { status: 400 }
    );
  }
});
