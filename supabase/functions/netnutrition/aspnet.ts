export function parseHiddenFields(html: string) {
const get = (name: string) => {
const match = html.match(
new RegExp(`id="${name}" value="([^"]+)"`)
);
return match ? match[1] : "";
};

return {
__VIEWSTATE: get("__VIEWSTATE"),
__VIEWSTATEGENERATOR: get("__VIEWSTATEGENERATOR"),
__EVENTVALIDATION: get("__EVENTVALIDATION"),
};
}

// 🔥 THIS IS THE FIX FOR YOUR BUG
export function extractUpdatePanel(ajax: string) {
// ASP.NET AJAX format:
// |updatePanel|panelID|HTML|...

const parts = ajax.split("|");

for (let i = 0; i < parts.length; i++) {
if (parts[i] === "updatePanel") {
return parts[i + 2]; // HTML fragment
}
}

throw new Error("Failed to extract update panel");
}
