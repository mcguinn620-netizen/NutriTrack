export function parseUnits(html: string) {
  const units: any[] = [];

  const regex = /data-unitid="(\d+)"[^>]*>([^<]+)/g;

  let match;
  while ((match = regex.exec(html))) {
    units.push({
      id: match[1],
      name: match[2].trim(),
    });
  }

  return units;
}
