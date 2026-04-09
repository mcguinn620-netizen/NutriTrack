import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parseHiddenFields } from "./aspnet.ts";

type CookieJar = Record<string, string>;

type NetNutritionRequest = {
  baseUrl?: string;
  unitId?: string;
  childUnitId?: string;
  menuId?: string;
  itemId?: string;
};

type PanelVisibility = {
  childUnitsPanel: boolean;
  coursesPanel: boolean;
  itemPanel: boolean;
};

type NamedEntity = {
  id: string;
  name: string;
};

const DEFAULT_BASE_URL = "https://netnutrition.bsu.edu/NetNutrition/1";

const DEFAULT_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const STARTUP_ERROR_TEXT = "NetNutrition Start-up Error";

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

const parseVisiblePanel = (html: string): PanelVisibility => {
  const isVisible = (id: string) => {
    const panel = html.match(new RegExp(`<[^>]*id=["']${id}["'][^>]*>`, "i"))?.[0] ?? "";
    if (!panel) return false;
    if (/\bhidden\b/i.test(panel)) return false;
    const styleMatch = panel.match(/style=["']([^"']*)["']/i)?.[1] ?? "";
    if (/display\s*:\s*none/i.test(styleMatch)) return false;
    const classMatch = panel.match(/class=["']([^"']*)["']/i)?.[1] ?? "";
    if (/\bhidden\b/i.test(classMatch)) return false;
    return true;
  };

  return {
    childUnitsPanel: isVisible("childUnitsPanel"),
    coursesPanel: isVisible("coursesPanel"),
    itemPanel: isVisible("itemPanel"),
  };
};

const parseUnits = (html: string): NamedEntity[] => {
  const units: NamedEntity[] = [];
  const seen = new Set<string>();

  const listBlock = html.match(/<[^>]*id=["']cbo_nn_unitDataList["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1] ?? html;
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of listBlock.matchAll(anchorRegex)) {
    const attrs = match[1] ?? "";
    const label = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const onclick = attrs.match(/onclick=["']([^"']+)["']/i)?.[1] ?? "";
    const id = onclick.match(/NetNutrition\.UI\.unitsSelectUnit\((\d+)\)/i)?.[1] ?? "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    units.push({ id, name: label });
  }

  return units;
};

const parseMenus = (html: string): NamedEntity[] => {
  const menus: NamedEntity[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? "";
    const label = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const onclick = attrs.match(/onclick=["']([^"']+)["']/i)?.[1] ?? "";
    const id = onclick.match(/(?:coursesSelectCourse|menuListSelectMenu)\((\d+)\)/i)?.[1] ?? "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    menus.push({ id, name: label });
  }

  return menus;
};

const parseItems = (html: string): NamedEntity[] => {
  const items: NamedEntity[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? "";
    const label = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const onclick = attrs.match(/onclick=["']([^"']+)["']/i)?.[1] ?? "";
    const id = onclick.match(/(?:ShowItemNutritionLabel|itemsSelectItem)\((\d+)\)/i)?.[1] ?? "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, name: label });
  }

  return items;
};

const parseNutrition = (html: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const match of html.matchAll(/<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
    const key = (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const value = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
};

const buildPostbackBody = (
  hidden: ReturnType<typeof parseHiddenFields>,
  eventTarget: string,
  eventArgument: string,
): URLSearchParams => {
  const body = new URLSearchParams();
  body.set("__EVENTTARGET", eventTarget);
  body.set("__EVENTARGUMENT", eventArgument);
  body.set("__LASTFOCUS", "");
  body.set("__VIEWSTATE", hidden.__VIEWSTATE);
  body.set("__EVENTVALIDATION", hidden.__EVENTVALIDATION);
  if (hidden.__VIEWSTATEGENERATOR) {
    body.set("__VIEWSTATEGENERATOR", hidden.__VIEWSTATEGENERATOR);
  }
  return body;
};

const bootstrapSession = async (baseUrl: string, jar: CookieJar): Promise<string> => {
  const initial = await fetchWithCookies(baseUrl, { method: "GET" }, jar);

  if ([301, 302, 303, 307, 308].includes(initial.status)) {
    const location = initial.headers.get("location");
    if (location) {
      const redirectedUrl = new URL(location, baseUrl).toString();
      const redirected = await fetchWithCookies(redirectedUrl, { method: "GET" }, jar);
      return await redirected.text();
    }
  }

  return await initial.text();
};

serve(async (req) => {
  try {
    if (!["GET", "POST"].includes(req.method)) {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = req.method === "POST"
      ? (await req.json().catch(() => ({})) as NetNutritionRequest)
      : ({} as NetNutritionRequest);

    const {
      baseUrl = DEFAULT_BASE_URL,
      unitId,
      childUnitId,
      menuId,
      itemId,
    } = payload;

    const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const jar: CookieJar = {};

    let currentHtml = await bootstrapSession(normalizedBase, jar);
    if (currentHtml.includes(STARTUP_ERROR_TEXT)) {
      console.log("[POST STEP] startup-error-retry-bootstrap");
      Object.keys(jar).forEach((key) => delete jar[key]);
      currentHtml = await bootstrapSession(normalizedBase, jar);
    }

    let hidden = parseHiddenFields(currentHtml);
    console.log("[VIEWSTATE LENGTH]", hidden.__VIEWSTATE.length);

    const units = parseUnits(currentHtml);

    let menus: NamedEntity[] = [];
    let items: NamedEntity[] = [];
    let nutrition: Record<string, string> = {};

    const postStep = async (stepName: string, eventTarget: string, eventArgument: string) => {
      console.log("[POST STEP]", stepName);
      const body = buildPostbackBody(hidden, eventTarget, eventArgument);
      const response = await fetchWithCookies(
        normalizedBase,
        {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: new URL(normalizedBase).origin,
            referer: normalizedBase,
          },
          body,
        },
        jar,
      );

      let html = await response.text();
      if (html.includes(STARTUP_ERROR_TEXT)) {
        console.log("[POST STEP] startup-error-retry", stepName);
        Object.keys(jar).forEach((key) => delete jar[key]);
        const fresh = await bootstrapSession(normalizedBase, jar);
        hidden = parseHiddenFields(fresh);
        const retryBody = buildPostbackBody(hidden, eventTarget, eventArgument);
        const retry = await fetchWithCookies(
          normalizedBase,
          {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              origin: new URL(normalizedBase).origin,
              referer: normalizedBase,
            },
            body: retryBody,
          },
          jar,
        );
        html = await retry.text();
      }

      const nextHidden = parseHiddenFields(html);
      if (nextHidden.__VIEWSTATE) {
        hidden = nextHidden;
      }
      console.log("[VIEWSTATE LENGTH]", hidden.__VIEWSTATE.length);

      const panels = parseVisiblePanel(html);
      console.log("[PANELS]", panels);
      return { html, panels };
    };

    const selectedUnit = unitId || units[0]?.id;
    if (selectedUnit) {
      const { html, panels } = await postStep("select-unit", "units", selectedUnit);

      if (panels.childUnitsPanel) {
        const childUnits = parseUnits(html);
        const selectedChild = childUnitId || childUnits[0]?.id;
        if (selectedChild) {
          const child = await postStep("select-child-unit", "childUnits", selectedChild);
          menus = parseMenus(child.html);
          if (child.panels.itemPanel) {
            items = parseItems(child.html);
          }
        }
      } else {
        menus = parseMenus(html);
        if (panels.itemPanel) {
          items = parseItems(html);
        }
      }

      const selectedMenu = menuId || menus[0]?.id;
      if (selectedMenu) {
        const menu = await postStep("select-menu", "courses", selectedMenu);
        items = parseItems(menu.html);
      }

      const selectedItem = itemId || items[0]?.id;
      if (selectedItem) {
        const item = await postStep("select-item", "items", selectedItem);
        nutrition = parseNutrition(item.html);
      }
    }

    return Response.json({
      success: true,
      units,
      menus,
      items,
      nutrition,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
