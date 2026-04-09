export type ParsedUnit = {
  id: string;
  name: string;
};

const decodeHtml = (text: string): string =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();

const pushIfValid = (units: ParsedUnit[], id: string, name: string) => {
  const normalizedId = id.trim();
  const normalizedName = decodeHtml(name.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedId || !normalizedName) return;
  if (units.some((unit) => unit.id === normalizedId)) return;

  units.push({ id: normalizedId, name: normalizedName });
};

export function parseUnits(html: string): ParsedUnit[] {
  const units: ParsedUnit[] = [];

  // ✅ STRATEGY 1 (PRIMARY): NetNutrition onclick pattern
  const onclickRegex =
    /<a[^>]*onclick=["'][^"']*unitsSelectUnit\((\d+)\)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(onclickRegex)) {
    const id = match[1] ?? "";
    const name = match[2] ?? "";
    pushIfValid(units, id, name);
  }

  if (units.length > 0) return units;

  // STRATEGY 2: data-unitid
  const dataUnitRegex =
    /data-unitid=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\//gi;

  for (const match of html.matchAll(dataUnitRegex)) {
    pushIfValid(units, match[1] ?? "", match[2] ?? "");
  }

  if (units.length > 0) return units;

  // STRATEGY 3: anchor fallback
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRegex)) {
    const attrs = match[1] ?? "";
    const name = match[2] ?? "";

    const idMatch =
      attrs.match(/[?&]unitid=(\d+)/i) ??
      attrs.match(/\bunit(?:id)?[-_]?(\d+)\b/i);

    if (idMatch?.[1]) {
      pushIfValid(units, idMatch[1], name);
    }
  }

  return units;
}
