import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

const BASE = "https://netnutrition.bsu.edu/NetNutrition/1";

const COOKIE =
  "CBORD.netnutrition2=NNexternalID=1; ASP.NET_SessionId=5x1yih45b3cspjkbccfl2nof";

// ---------- ASP.NET helpers ----------
async function fetchPage(url: string, options: any = {}) {
  return await fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": COOKIE,
      ...options.headers,
    },
  });
}

function extractAspFields(html: string) {
  const $ = load(html);
  return {
    viewstate: $("#__VIEWSTATE").val() as string,
    eventvalidation: $("#__EVENTVALIDATION").val() as string,
    viewstategen: $("#__VIEWSTATEGENERATOR").val() as string,
    $,
  };
}

// ---------- PARSER ----------
type ParsedUnit = {
  id: string;
  name: string;
};

const decodeHtml = (text: string): string =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();

const pushIfValid = (units: ParsedUnit[], id: string, name: string) => {
  const normalizedId = id.trim();
  const normalizedName = decodeHtml(name.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedId || !normalizedName) return;
  if (units.some((u) => u.id === normalizedId)) return;

  units.push({ id: normalizedId, name: normalizedName });
};

function parseUnits(html: string): ParsedUnit[] {
  const units: ParsedUnit[] = [];

  // NetNutrition onclick pattern
  const onclickRegex =
    /<a[^>]*onclick=["'][^"']*unitsSelectUnit\((\d+)\)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(onclickRegex)) {
    pushIfValid(units, match[1] ?? "", match[2] ?? "");
  }

  return units;
}

// ---------- EDGE FUNCTION ----------
serve(async () => {
  try {
    // STEP 1: GET
    const res1 = await fetchPage(BASE, { method: "GET" });
    const html1 = await res1.text();

    if (!html1 || html1.length < 1000) {
      throw new Error("Initial HTML blocked");
    }

    const { viewstate, eventvalidation, viewstategen } =
      extractAspFields(html1);

    if (!viewstate || !eventvalidation) {
      throw new Error("Missing ASP.NET fields");
    }

    const units = parseUnits(html1);

    if (units.length === 0) {
      throw new Error("No units found");
    }

    // STEP 2: POST select unit
    const selected = units[0];

    const body = new URLSearchParams({
      "__EVENTTARGET": "units",
      "__EVENTARGUMENT": selected.id,
      "__VIEWSTATE": viewstate,
      "__EVENTVALIDATION": eventvalidation,
      "__VIEWSTATEGENERATOR": viewstategen,
    });

    const res2 = await fetchPage(BASE, {
      method: "POST",
      body,
    });

    const html2 = await res2.text();

    if (html2.includes("Start-up Error")) {
      throw new Error("ASP.NET rejected request");
    }

    const $$ = load(html2);

    return new Response(
      JSON.stringify({
        success: true,
        units,
        selectedUnit: selected,
        panels: {
          childUnits: $$("#childUnitsPanel").html() ? true : false,
          courses: $$("#coursesPanel").html() ? true : false,
          items: $$("#itemPanel").html() ? true : false,
        },
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
