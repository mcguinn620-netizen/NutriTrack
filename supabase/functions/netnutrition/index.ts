import { parseHiddenFields, extractUpdatePanel } from “./aspnet.ts”;
import { parseUnits } from “./parser.ts”;

const BASE = “http://netnutrition.bsu.edu/NetNutrition/1”;

Deno.serve(async () => {
try {
const jar: string[] = [];
const fetchWithCookies = async (url: string, options: any = {}) => {
  options.headers = options.headers || {};
  if (jar.length) {
    options.headers["cookie"] = jar.join("; ");
  }

  const res = await fetch(url, options);

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) jar.push(setCookie);

  return res;
};

// STEP 1: INITIAL LOAD
const res1 = await fetchWithCookies(BASE);
const html1 = await res1.text();

const hidden = parseHiddenFields(html1);

// STEP 2: TRIGGER FIRST UNIT LOAD (CRITICAL)
const body = new URLSearchParams({
  __EVENTTARGET: "ctl00$ContentPlaceHolder1$UnitList",
  __EVENTARGUMENT: "0",
  __VIEWSTATE: hidden.__VIEWSTATE,
  __VIEWSTATEGENERATOR: hidden.__VIEWSTATEGENERATOR,
  __EVENTVALIDATION: hidden.__EVENTVALIDATION,
});

const res2 = await fetchWithCookies(
  `${BASE}/Unit/SelectUnitFromSideBar`,
  {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-requested-with": "XMLHttpRequest",
    },
    body,
  }
);

const ajax = await res2.text();

// 🔥 CRITICAL FIX: extract ASP.NET AJAX panel
const panelHtml = extractUpdatePanel(ajax);

console.log("[DEBUG PANEL]", panelHtml.slice(0, 300));

const units = parseUnits(panelHtml);

console.log("[netnutrition] units found:", units.length);

if (!units.length) {
  throw new Error("Step failed: parse units");
}

return new Response(
  JSON.stringify({
    success: true,
    units,
  }),
  { headers: { "content-type": "application/json" } }
); } catch (err) {
return new Response(
JSON.stringify({
success: false,
error: err.message,
}),
{ status: 500 }
);
}
});
