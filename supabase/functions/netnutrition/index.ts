// index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const NETNUTRITION_URL = "http://netnutrition.bsu.edu/NetNutrition/1";

serve(async (req) => {
  try {
    // Fetch the page HTML
    const res = await fetch(NETNUTRITION_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch NetNutrition page", status: res.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const html = await res.text();

    // Parse HTML using deno_dom
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
      return new Response(
        JSON.stringify({ error: "Failed to parse HTML" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Example: extract all "units" from table rows
    const units: { name: string; link?: string }[] = [];
    const tableRows = doc.querySelectorAll("table tr");
    tableRows.forEach((row) => {
      const cell = row.querySelector("td a");
      if (cell) {
        units.push({ name: cell.textContent.trim(), link: cell.getAttribute("href") || undefined });
      }
    });

    // Return JSON
    return new Response(JSON.stringify({ units }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Scraper failed", message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});