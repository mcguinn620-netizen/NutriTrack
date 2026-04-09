import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { extractUpdatePanel, parseHiddenFields } from "./aspnet.ts";
import { parseUnits } from "./parser.ts";

type CookieJar = Record<string, string>;

type NetNutritionRequest = {
  baseUrl: string;
  unitId?: string;
};

const DEFAULT_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const parseSetCookie = (setCookieValue: string): [string, string] | null => {
  const firstPart = setCookieValue.split(";")[0] ?? "";
  const index = firstPart.indexOf("=");
  if (index <= 0) return null;

  const key = firstPart.slice(0, index).trim();
  const value = firstPart.slice(index + 1).trim();
  if (!key) return null;

  return [key, value];
};

const jarToHeader = (jar: CookieJar): string =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

const updateJarFromResponse = (response: Response, jar: CookieJar) => {
  const raw = response.headers.get("set-cookie");
  if (raw) {
    const parsed = parseSetCookie(raw);
    if (parsed) {
      jar[parsed[0]] = parsed[1];
    }
  }

  const splitCookies = response.headers
    .get("set-cookie")
    ?.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/g) ?? [];
  for (const cookie of splitCookies) {
    const parsed = parseSetCookie(cookie);
    if (parsed) {
      jar[parsed[0]] = parsed[1];
    }
  }
};

const fetchWithCookies = async (
  input: string,
  init: RequestInit,
  jar: CookieJar,
): Promise<Response> => {
  const headers = new Headers(init.headers ?? {});

  for (const [k, v] of Object.entries(DEFAULT_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }

  const cookieHeader = jarToHeader(jar);
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    redirect: "manual",
  });

  updateJarFromResponse(response, jar);
  return response;
};

const bootstrapSession = async (baseUrl: string, jar: CookieJar): Promise<string> => {
  const entry = await fetchWithCookies(baseUrl, { method: "GET" }, jar);

  if ([301, 302, 303, 307, 308].includes(entry.status)) {
    const location = entry.headers.get("location");
    if (location) {
      const redirectUrl = new URL(location, baseUrl).toString();
      const redirected = await fetchWithCookies(redirectUrl, { method: "GET" }, jar);
      return await redirected.text();
    }
  }

  return await entry.text();
};

const buildSideBarBody = (
  hidden: ReturnType<typeof parseHiddenFields>,
  unitId: string,
): URLSearchParams => {
  const body = new URLSearchParams();
  body.set("__EVENTTARGET", "");
  body.set("__EVENTARGUMENT", "");
  body.set("__LASTFOCUS", "");
  body.set("__VIEWSTATE", hidden.__VIEWSTATE);
  body.set("__VIEWSTATEGENERATOR", hidden.__VIEWSTATEGENERATOR);
  body.set("__EVENTVALIDATION", hidden.__EVENTVALIDATION);
  body.set("ctl00$ScriptManager1", "ctl00$MainContent$upnlMain|ctl00$MainContent$btnUnit");
  body.set("ctl00$MainContent$hfSelectedUnitId", unitId);
  body.set("ctl00$MainContent$btnUnit", "");
  body.set("__ASYNCPOST", "true");
  return body;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { baseUrl, unitId = "" } = (await req.json()) as NetNutritionRequest;
    if (!baseUrl) {
      return Response.json({ error: "baseUrl is required" }, { status: 400 });
    }

    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const selectUrl = new URL("Unit/SelectUnitFromSideBar", normalizedBase).toString();

    const jar: CookieJar = {};

    const html = await bootstrapSession(normalizedBase, jar);
    const hidden = parseHiddenFields(html);

    const body = buildSideBarBody(hidden, unitId);
    const response = await fetchWithCookies(
      selectUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-microsoftajax": "Delta=true",
          "x-requested-with": "XMLHttpRequest",
          origin: new URL(normalizedBase).origin,
          referer: normalizedBase,
        },
        body,
      },
      jar,
    );

    const rawResponse = await response.text();
    const panelHtml = extractUpdatePanel(rawResponse);
    const units = parseUnits(panelHtml);

    console.log("[DEBUG PANEL]", panelHtml.slice(0, 2000));
    console.log("[RAW RESPONSE]", rawResponse.slice(0, 2000));

    return Response.json({ units, status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});
