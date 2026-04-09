export type AspNetHiddenFields = {
  __VIEWSTATE: string;
  __VIEWSTATEGENERATOR: string;
  __EVENTVALIDATION: string;
};

export function parseHiddenFields(html: string): AspNetHiddenFields {
  const get = (name: string) => {
    const pattern = new RegExp(
      `(?:id|name)=["']${name}["'][^>]*value=["']([^"']*)["']`,
      "i",
    );
    const match = html.match(pattern);
    return match?.[1] ?? "";
  };

  return {
    __VIEWSTATE: get("__VIEWSTATE"),
    __VIEWSTATEGENERATOR: get("__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: get("__EVENTVALIDATION"),
  };
}

export function extractUpdatePanel(response: string): string {
  if (!response) {
    console.log("[RAW RESPONSE]", response);
    throw new Error("Failed to extract update panel: empty response");
  }

  // ASP.NET AJAX postback payload format: ...|updatePanel|panelId|<html>...|
  if (response.includes("|updatePanel|")) {
    const parts = response.split("|");

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "updatePanel") {
        const candidate = parts[i + 2] ?? "";
        if (candidate.trim()) {
          return candidate;
        }
      }
    }
  }

  // Fallback for full HTML responses
  if (/<(?:html|body|div|ul|li|a)\b/i.test(response)) {
    return response;
  }

  console.log("[RAW RESPONSE]", response.slice(0, 2000));
  throw new Error("Failed to extract update panel");
}
