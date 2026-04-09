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

export function extractUpdatePanel(ajax: string) {
  const parts = ajax.split("|");

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "updatePanel") {
      return parts[i + 2];
    }
  }

  throw new Error("Failed to extract update panel");
}
