import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_FOOD_ITEMS_KEY = '@recent_food_items';
const MAX_RECENT_ITEMS = 20;

export interface RecentFoodItem {
  id: string;
  name: string;
  station_id?: string;
  station_name?: string;
  viewed_at: number;
}

function sanitizeRecentItems(value: unknown): RecentFoodItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sanitized: RecentFoodItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;

    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    if (!id) continue;

    sanitized.push({
      id,
      name: String(row.name ?? 'Unknown Item').trim() || 'Unknown Item',
      station_id: row.station_id == null ? undefined : String(row.station_id),
      station_name: row.station_name == null ? undefined : String(row.station_name),
      viewed_at: Number(row.viewed_at ?? Date.now()),
    });
  }

  return sanitized.sort((a, b) => b.viewed_at - a.viewed_at).slice(0, MAX_RECENT_ITEMS);
}

async function getRecentItemsRaw(): Promise<RecentFoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FOOD_ITEMS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return sanitizeRecentItems(parsed);
  } catch (error) {
    console.warn('[recentItemsService] Failed to load recent food items:', error);
    return [];
  }
}

export async function getRecentFoodItems(): Promise<string[]> {
  const items = await getRecentItemsRaw();
  return items.map((item) => item.id);
}

export async function getRecentFoodItemEntries(): Promise<RecentFoodItem[]> {
  return getRecentItemsRaw();
}

export async function recordRecentFoodItem(
  item: Pick<RecentFoodItem, 'id'> & Partial<Omit<RecentFoodItem, 'id' | 'viewed_at'>>,
): Promise<string[]> {
  const safeId = String(item.id ?? '').trim();
  if (!safeId) return getRecentFoodItems();

  try {
    const current = await getRecentItemsRaw();
    const existing = current.find((entry) => entry.id === safeId);
    const deduped = current.filter((entry) => entry.id !== safeId);

    const next: RecentFoodItem[] = [
      {
        id: safeId,
        name: String(item.name ?? existing?.name ?? 'Unknown Item'),
        station_id: item.station_id ?? existing?.station_id,
        station_name: item.station_name ?? existing?.station_name,
        viewed_at: Date.now(),
      },
      ...deduped,
    ].slice(0, MAX_RECENT_ITEMS);

    await AsyncStorage.setItem(RECENT_FOOD_ITEMS_KEY, JSON.stringify(next));
    return next.map((entry) => entry.id);
  } catch (error) {
    console.warn('[recentItemsService] Failed to record recent food item:', { id: safeId, error });
    return getRecentFoodItems();
  }
}

export async function clearRecentFoodItems(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_FOOD_ITEMS_KEY);
  } catch (error) {
    console.warn('[recentItemsService] Failed to clear recent food items:', error);
  }
}
