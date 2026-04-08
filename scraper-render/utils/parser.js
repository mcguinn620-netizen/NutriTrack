import fetch from "node-fetch";

class Session {
  constructor() {
    this.cookie = "";
  }

  update(res) {
    const setCookie = res.headers.raw()["set-cookie"];
    if (setCookie) {
      this.cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    }
  }

  headers(extra = {}) {
    return {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: this.cookie,
      ...extra,
    };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(err) {
  const code = err?.code || "";
  const message = String(err?.message || "");
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    /timed out|network|socket hang up/i.test(message)
  );
}

async function safeFetchWithRetry(url, opts, session, retries = 3, backoff = 500) {
  try {
    const res = await fetch(url, { ...opts, timeout: 20000, headers: session.headers(opts.headers || {}) });
    session.update(res);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    if (retries > 0 && isRetryableError(err)) {
      await sleep(backoff);
      return safeFetchWithRetry(url, opts, session, retries - 1, backoff * 2);
    }

    const wrapped = new Error(`Request failed for ${url}: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

export async function scrapeNetNutrition() {
  const session = new Session();
  const BASE = "https://netnutrition.bsu.edu/NetNutrition";

  try {
    await fetch(`${BASE}/1`, {
      headers: session.headers({ Accept: "text/html" }),
      timeout: 20000,
    }).then((res) => session.update(res));

    const root = await safeFetchWithRetry(
      `${BASE}/Unit/SelectUnitFromSideBar`,
      { method: "POST", body: JSON.stringify({ unitOid: 1 }) },
      session,
    );

    if (!root?.childUnitsPanel?.units) {
      throw new Error("No dining halls found");
    }

    const halls = [];

    for (const hall of root.childUnitsPanel.units) {
      const hallId = hall.unitOid;
      const hallRes = await safeFetchWithRetry(
        `${BASE}/Unit/SelectUnitFromSideBar`,
        { method: "POST", body: JSON.stringify({ unitOid: hallId }) },
        session,
      );

      const menus = hallRes?.menuPanel?.menus || [];
      const hallObj = { id: hallId, name: hall.name, menus: [] };

      for (const menu of menus) {
        const menuId = menu.menuOid;
        const menuRes = await safeFetchWithRetry(
          `${BASE}/Menu/SelectMenu`,
          { method: "POST", body: JSON.stringify({ menuOid: menuId }) },
          session,
        );

        const items = menuRes?.itemPanel?.items || [];
        hallObj.menus.push({
          id: menuId,
          name: menu.name,
          items: items.map((i) => ({ id: i.recipeOid, name: i.name })),
        });
      }

      halls.push(hallObj);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      halls,
    };
  } catch (err) {
    throw new Error(`NetNutrition scrape failed after retries: ${err.message}`);
  }
}
