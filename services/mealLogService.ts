import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '@/services/nutritionTypes';

const MEAL_LOG_KEY = '@meal_log_entries_v1';

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface MealLogNutritionSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface MealLogFoodSnapshot {
  foodItemId: string;
  name: string;
  stationId: string;
  stationName?: string;
  servingSize: string;
  allergens: string[];
  dietaryFlags: string[];
  nutrients: MealLogNutritionSnapshot;
}

export interface MealLogEntry {
  id: string;
  date: string;
  loggedAt: string;
  category: MealCategory;
  quantity: number;
  source: 'tray' | 'direct' | 'favorites';
  food: MealLogFoodSnapshot;
}

export interface TrayPersistedEntry {
  item: FoodItem;
  quantity: number;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return 0;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function readMetric(item: FoodItem, keys: string[]): number {
  const nutrients = item.nutrients ?? {};
  for (const [key, value] of Object.entries(nutrients)) {
    if (keys.includes(key.toLowerCase())) {
      return toNumber(value);
    }
  }
  return 0;
}

export function createFoodSnapshot(item: FoodItem, stationName?: string): MealLogFoodSnapshot {
  return {
    foodItemId: item.id,
    name: item.name,
    stationId: item.station_id,
    stationName,
    servingSize: item.serving_size,
    allergens: item.allergens ?? [],
    dietaryFlags: item.dietary_flags ?? [],
    nutrients: {
      calories: readMetric(item, ['calories']),
      protein: readMetric(item, ['protein']),
      carbs: readMetric(item, ['carbs', 'carbohydrates']),
      fat: readMetric(item, ['fat', 'total fat']),
      fiber: readMetric(item, ['fiber']),
      sugar: readMetric(item, ['sugar']),
      sodium: readMetric(item, ['sodium']),
      cholesterol: readMetric(item, ['cholesterol']),
    },
  };
}

function sanitizeMealLog(value: unknown): MealLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is MealLogEntry => {
    return !!entry && typeof entry === 'object' && 'id' in entry && 'date' in entry && 'category' in entry && 'food' in entry;
  });
}

async function getAllEntries(): Promise<MealLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEAL_LOG_KEY);
    if (!raw) return [];
    return sanitizeMealLog(JSON.parse(raw));
  } catch (error) {
    console.warn('[mealLogService] Failed loading meal log:', error);
    return [];
  }
}

async function saveAllEntries(entries: MealLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(MEAL_LOG_KEY, JSON.stringify(entries));
}

function getDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function createEntry(
  snapshot: MealLogFoodSnapshot,
  category: MealCategory,
  quantity: number,
  source: MealLogEntry['source'],
  date = getDateString(),
): MealLogEntry {
  const loggedAt = new Date().toISOString();
  return {
    id: `${snapshot.foodItemId}-${loggedAt}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    loggedAt,
    category,
    quantity,
    source,
    food: snapshot,
  };
}

export const mealLogService = {
  async getByDate(date: string): Promise<MealLogEntry[]> {
    const all = await getAllEntries();
    return all
      .filter((entry) => entry.date === date)
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  },

  async getByDateRange(startDate: string, endDate: string): Promise<MealLogEntry[]> {
    const all = await getAllEntries();
    return all
      .filter((entry) => entry.date >= startDate && entry.date <= endDate)
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  },

  async logFoodItem(params: {
    item: FoodItem;
    category: MealCategory;
    quantity?: number;
    source?: MealLogEntry['source'];
    stationName?: string;
    date?: string;
  }): Promise<MealLogEntry> {
    const entry = createEntry(
      createFoodSnapshot(params.item, params.stationName),
      params.category,
      Math.max(1, Math.floor(params.quantity ?? 1)),
      params.source ?? 'direct',
      params.date,
    );

    const all = await getAllEntries();
    all.push(entry);
    await saveAllEntries(all);
    return entry;
  },

  async logTrayEntries(params: {
    entries: TrayPersistedEntry[];
    category: MealCategory;
    source?: MealLogEntry['source'];
    stationName?: string;
    date?: string;
  }): Promise<MealLogEntry[]> {
    if (params.entries.length === 0) return [];

    const newEntries = params.entries.map((entry) =>
      createEntry(
        createFoodSnapshot(entry.item, params.stationName),
        params.category,
        Math.max(1, Math.floor(entry.quantity)),
        params.source ?? 'tray',
        params.date,
      ),
    );

    const all = await getAllEntries();
    all.push(...newEntries);
    await saveAllEntries(all);
    return newEntries;
  },

  async removeEntry(entryId: string): Promise<void> {
    const all = await getAllEntries();
    await saveAllEntries(all.filter((entry) => entry.id !== entryId));
  },
};
