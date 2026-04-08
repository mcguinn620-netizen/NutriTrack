import fetch from "node-fetch";

const BASE = "https://netnutrition.bsu.edu/NetNutrition";

// --- SESSION HANDLER ---
class Session {
  constructor() {
    this.cookie = "";
  }

  update(res) {
    const setCookie = res.headers.raw()["set-cookie"];
    if (setCookie) {
      this.cookie = setCookie.map(c => c.split(";")[0]).join("; ");
    }
  }

  headers(extra = {}) {
    return {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "Cookie": this.cookie,
      ...extra
    };
  }
}

// --- SAFE FETCH ---
async function safeFetch(url, options = {}, session) {
  const res = await fetch(url, {
    ...options,
    timeout: 20000
  });

  if (session) session.update(res);

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- MAIN SCRAPER ---
export async function scrapeNetNutrition() {
  const session = new Session();

  try {
    // STEP 1: INIT SESSION
    await fetch(`${BASE}/1`, {
      headers: session.headers({ Accept: "text/html" })
    }).then(res => session.update(res));

    // STEP 2: LOAD ROOT → GET DINING HALLS
    const root = await safeFetch(
      `${BASE}/Unit/SelectUnitFromSideBar`,
      {
        method: "POST",
        body: JSON.stringify({ unitOid: 1 })
      },
      session
    );

    if (!root?.childUnitsPanel?.units) {
      throw new Error("No dining halls returned");
    }

    const results = [];

    // STEP 3: LOOP DINING HALLS
    for (const hall of root.childUnitsPanel.units) {
      const hallId = hall.unitOid;

      const hallRes = await safeFetch(
        `${BASE}/Unit/SelectUnitFromSideBar`,
        {
          method: "POST",
          body: JSON.stringify({ unitOid: hallId })
        },
        session
      );

      const menus = hallRes?.menuPanel?.menus || [];

      const hallObj = {
        id: hallId,
        name: hall.name,
        menus: []
      };

      // STEP 4: LOOP MENUS
      for (const menu of menus) {
        const menuId = menu.menuOid;

        const menuRes = await safeFetch(
          `${BASE}/Menu/SelectMenu`,
          {
            method: "POST",
            body: JSON.stringify({ menuOid: menuId })
          },
          session
        );

        const items = menuRes?.itemPanel?.items || [];

        hallObj.menus.push({
          id: menuId,
          name: menu.name,
          items: items.map(i => ({
            id: i.recipeOid,
            name: i.name
          }))
        });
      }

      results.push(hallObj);
    }

    return {
      success: true,
      halls: results,
      totalHalls: results.length,
      timestamp: new Date().toISOString()
    };

  } catch (err) {
    console.error("[SCRAPER ERROR]", err);

    return {
      success: false,
      error: err.message
    };
  }
}