import { load } from "cheerio";

const HIDDEN_FIELD_SELECTORS = [
  "__VIEWSTATE",
  "__EVENTVALIDATION",
  "__VIEWSTATEGENERATOR",
  "__EVENTTARGET",
  "__EVENTARGUMENT",
  "__LASTFOCUS",
];

export function parseHiddenFields(html) {
  const $ = load(html);
  const fields = {};

  for (const fieldName of HIDDEN_FIELD_SELECTORS) {
    const value = $(`input[name='${fieldName}']`).attr("value");
    if (value !== undefined) {
      fields[fieldName] = value;
    }
  }

  $("input[type='hidden'][name]").each((_, input) => {
    const name = $(input).attr("name");
    const value = $(input).attr("value") ?? "";
    if (name && !(name in fields)) {
      fields[name] = value;
    }
  });

  return fields;
}

export function parseDiningHalls(html) {
  const $ = load(html);
  const halls = [];
  const seen = new Set();

  const optionSelectors = [
    "select[name*='Unit'] option",
    "select[id*='Unit'] option",
    "select[name*='location'] option",
    "select[id*='location'] option",
    "select option",
  ];

  for (const selector of optionSelectors) {
    $(selector).each((_, option) => {
      const value = ($(option).attr("value") || "").trim();
      const name = $(option).text().trim();
      if (!value || !name || /select|choose/i.test(name)) {
        return;
      }

      const key = `${value}::${name}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      halls.push({ id: value, name });
    });

    if (halls.length > 0) {
      return halls;
    }
  }

  return halls;
}

export function parseMenu(html, hallLabel) {
  const $ = load(html);
  const categories = [];

  const headingSelectors = ["h2", "h3", ".cbo_nn_itemGroupRow", ".category", "th"];
  for (const selector of headingSelectors) {
    $(selector).each((_, heading) => {
      const headingText = $(heading).text().replace(/\s+/g, " ").trim();
      if (!headingText || headingText.length > 100 || headingText.length < 2) {
        return;
      }

      const nearbyItems = [];
      let cursor = $(heading).next();
      for (let i = 0; i < 8 && cursor.length > 0; i += 1) {
        cursor
          .find("a, li, .menu-item, .cbo_nn_itemHover, .cbo_nn_itemName")
          .each((_, item) => {
            const itemName = $(item).text().replace(/\s+/g, " ").trim();
            if (itemName && itemName.length <= 120) {
              nearbyItems.push(itemName);
            }
          });
        cursor = cursor.next();
      }

      if (nearbyItems.length > 0) {
        categories.push({
          category: headingText,
          items: [...new Set(nearbyItems)],
        });
      }
    });

    if (categories.length > 0) {
      break;
    }
  }

  if (categories.length === 0) {
    const fallbackItems = [];
    $("a, li, .menu-item, .cbo_nn_itemHover, .cbo_nn_itemName").each((_, item) => {
      const name = $(item).text().replace(/\s+/g, " ").trim();
      if (name && name.length <= 120) {
        fallbackItems.push(name);
      }
    });

    if (fallbackItems.length > 0) {
      categories.push({
        category: "Menu Items",
        items: [...new Set(fallbackItems)],
      });
    }
  }

  const items = categories.flatMap((entry) =>
    entry.items.map((name) => ({
      name,
      category: entry.category,
    }))
  );

  return {
    hall: hallLabel,
    categories,
    items,
  };
}
