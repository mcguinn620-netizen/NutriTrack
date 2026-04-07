import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const RENDER_URL = "https://nutritrack-2jj9.onrender.com/netnutrition";

serve(async () => {
  try {
    const res = await fetch(RENDER_URL);

    const text = await res.text(); // 👈 safer than res.json()

    // DEBUG: log raw response
    console.log("Render response:", text);

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Render request failed",
          status: res.status,
          body: text
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try parsing JSON safely
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON from Render",
          raw: text
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Supabase fetch failed",
        details: err.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});