import fetch from "node-fetch";

// Extract ASP.NET hidden fields
function extractHidden(html, name) {
  const match = html.match(new RegExp(`name="${name}" value="(.*?)"`, "i"));
  return match ? match[1] : "";
}

function extractFields(html) {
  return {
    viewstate: extractHidden(html, "__VIEWSTATE"),
    eventvalidation: extractHidden(html, "__EVENTVALIDATION"),
    viewstategenerator: extractHidden(html, "__VIEWSTATEGENERATOR")
  };
}

// Session handler
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
      Cookie: this.cookie,
      ...extra
    };
  }
}

// Retry wrapper
async function fetchRetry(url, options, session, retries = 3) {
  try {
    const res = await fetch(url, options);
    session.update(res);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchRetry(url, options, session, retries - 1);
    }
    throw err;
  }
}

export async function scrapeNetNutrition() {
  const BASE = "https://netnutrition.bsu.edu/NetNutrition";
  const session = new Session();

  try {
    // STEP 1: Initial page load
    const res1 = await fetchRetry(`${BASE}/1`, {
      method: "GET",
      headers: session.headers({ Accept: "text/html" })
    }, session);

    const html = await res1.text();
    const fields = extractFields(html);

    if (!fields.viewstate) {
      throw new Error("Failed to extract VIEWSTATE");
    }

    // STEP 2: Simulate Continue button (CRITICAL)
    const form = new URLSearchParams({
      __EVENTTARGET: "ctl00$MainContent$btnContinue",
      __EVENTARGUMENT: "",
      __VIEWSTATE: fields.viewstate,
      __VIEWSTATEGENERATOR: fields.viewstategenerator,
      __EVENTVALIDATION: fields.eventvalidation
    });

    await fetchRetry(`${BASE}/1`, {
      method: "POST",
      headers: session.headers({
        "Content-Type": "application/x-www-form-urlencoded"
      }),
      body: form.toString()
    }, session);

    // STEP 3: Fetch dining halls
    const rootRes = await fetch(`${BASE}/Unit/SelectUnitFromSideBar`, {
      method: "POST",
      headers: session.headers({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ unitOid: 1 })
    });

    const root = await rootRes.json();

    if (!root?.childUnitsPanel?.units) {
      throw new Error("Dining halls not returned — session not initialized");
    }

    const halls = [];

    for (const hall of root.childUnitsPanel.units) {
      const hallRes = await fetch(`${BASE}/Unit/SelectUnitFromSideBar`, {
        method: "POST",
        headers: session.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ unitOid: hall.unitOid })
      });

      const hallData = await hallRes.json();
      const menus = hallData?.menuPanel?.menus || [];

      const hallObj = {
        id: hall.unitOid,
        name: hall.name,
        menus: []
      };

      for (const menu of menus) {
        const menuRes = await fetch(`${BASE}/Menu/SelectMenu`, {
          method: "POST",
          headers: session.headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ menuOid: menu.menuOid })
        });

        const menuData = await menuRes.json();
        const items = menuData?.itemPanel?.items || [];

        hallObj.menus.push({
          id: menu.menuOid,
          name: menu.name,
          items: items.map((i) => ({
            id: i.recipeOid,
            name: i.name
          }))
        });
      }

      halls.push(hallObj);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      halls
    };
  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    return { success: false, error: err.message };
  }
}
