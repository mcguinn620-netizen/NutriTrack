export function parseHiddenFields(html: string) {
  const get = (name: string) => {
    const match = html.match(new RegExp(`id="${name}" value="([^"]+)"`));
    return match ? match[1] : "";
  };

  return {
    __VIEWSTATE: get("__VIEWSTATE"),
    __VIEWSTATEGENERATOR: get("__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: get("__EVENTVALIDATION"),
  };
}

export function extractUpdatePanel(response: string) {
  // CASE 1: ASP.NET AJAX format
  if (response.includes("|updatePanel|")) {
    const parts = response.split("|");

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "updatePanel") {
        return parts[i + 2];
      }
    }
  }

  // CASE 2: FULL HTML fallback
  if (response.includes("<html") || response.includes("<div")) {
    console.log("[FALLBACK] Using full HTML response");
    return response;
  }

  // CASE 3: DEBUG FAILURE
  console.log("[RAW RESPONSE]", response.slice(0, 500));

  throw new Error("Failed to extract update panel");
}
