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
  const normalizedName = decodeHtml(name.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

  if (!normalizedId || !normalizedName) return;
  if (units.some((unit) => unit.id === normalizedId)) return;

  units.push({ id: normalizedId, name: normalizedName });
};

export function parseUnits(html: string): ParsedUnit[] {
  const units: ParsedUnit[] = [];

  // Strategy 1: Elements containing data-unitid
  const dataUnitRegex = /data-unitid=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\//gi;
  for (const match of html.matchAll(dataUnitRegex)) {
    pushIfValid(units, match[1] ?? "", match[2] ?? "");
  }
  if (units.length > 0) return units;

  // Strategy 2: Anchors containing unit query or known data attrs
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const attrs = match[1] ?? "";
    const name = match[2] ?? "";
    const idMatch =
      attrs.match(/data-unitid=["']?([^"'\s>]+)["']?/i) ??
      attrs.match(/[?&]unitid=(\d+)/i) ??
      attrs.match(/\bunit(?:id)?[-_]?(\d+)\b/i);

    if (idMatch?.[1]) {
      pushIfValid(units, idMatch[1], name);
    }
  }
  if (units.length > 0) return units;

  // Strategy 3: List items with unit-like ids
  const listItemRegex = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  for (const match of html.matchAll(listItemRegex)) {
    const attrs = match[1] ?? "";
    const content = match[2] ?? "";
    const idMatch =
      attrs.match(/data-unitid=["']?([^"'\s>]+)["']?/i) ??
      attrs.match(/id=["'][^"']*(\d+)["']/i) ??
      content.match(/data-unitid=["']?([^"'\s>]+)["']?/i);

    if (idMatch?.[1]) {
      pushIfValid(units, idMatch[1], content);
    }
  }

  return units;
}
