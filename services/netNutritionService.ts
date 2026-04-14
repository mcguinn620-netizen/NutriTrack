import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabaseClient';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const NUTRITION_CACHE_KEY_PREFIX = 'nutrition_cache:';
const NUTRITION_KEY_PREFIXES = ['dining_halls', 'stations:', 'food_items:'];

interface CachedPayload<T> {
  data: T;
  timestamp: number;
}

export interface DiningHall {
  id: string;
  name: string;
}

export interface Station {
  id: string;
  hall_id: string;
  name: string;
}

export interface FoodItem {
  id: string;
  station_id: string;
  name: string;
  serving_size: string;
  allergens: string[];
  dietary_flags: string[];
  nutrients: Record<string, unknown>;
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_TTL;
}

function getMemoryCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  if (isExpired(item.timestamp)) {
    cache.delete(key);
    return null;
  }

  return item.data as T;
}

function setMemoryCache<T>(key: string, data: T, timestamp = Date.now()): void {
  cache.set(key, {
    data,
    timestamp,
  });
}

function getStorageKey(cacheKey: string): string {
  return `${NUTRITION_CACHE_KEY_PREFIX}${cacheKey}`;
}

function shouldManageNutritionKey(cacheKey: string): boolean {
  return NUTRITION_KEY_PREFIXES.some((prefix) => cacheKey.startsWith(prefix));
}

export async function loadCachedValue<T>(key: string): Promise<T | null> {
  if (!shouldManageNutritionKey(key)) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(getStorageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed !== 'object' || !('timestamp' in parsed) || !('data' in parsed)) {
      await AsyncStorage.removeItem(getStorageKey(key));
      return null;
    }

    if (isExpired(parsed.timestamp)) {
      cache.delete(key);
      await AsyncStorage.removeItem(getStorageKey(key));
      return null;
    }

    setMemoryCache(key, parsed.data, parsed.timestamp);
    return parsed.data;
  } catch (error) {
    console.warn('[netNutritionService] Failed to load cache value:', { key, error });
    return null;
  }
}

export async function saveCachedValue<T>(key: string, data: T): Promise<void> {
  if (!shouldManageNutritionKey(key)) {
    return;
  }

  const payload: CachedPayload<T> = {
    data,
    timestamp: Date.now(),
  };

  setMemoryCache(key, data, payload.timestamp);

  try {
    await AsyncStorage.setItem(getStorageKey(key), JSON.stringify(payload));
  } catch (error) {
    console.warn('[netNutritionService] Failed to persist cache value:', { key, error });
  }
}

export async function clearAllCachedNutritionData(): Promise<void> {
  cache.clear();

  try {
    const keys = await AsyncStorage.getAllKeys();
    const nutritionKeys = keys.filter((key) => key.startsWith(NUTRITION_CACHE_KEY_PREFIX));
    if (nutritionKeys.length > 0) {
      await AsyncStorage.multiRemove(nutritionKeys);
    }
  } catch (error) {
    console.warn('[netNutritionService] Failed to clear cached nutrition data:', error);
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeNutrients(row: Record<string, unknown>): Record<string, unknown> {
  const fromJson = row.nutrients;
  if (fromJson && typeof fromJson === 'object' && !Array.isArray(fromJson)) {
    return fromJson as Record<string, unknown>;
  }

  return {
    calories: row.calories ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    fiber: row.fiber ?? 0,
    sugar: row.sugar ?? 0,
    sodium: row.sodium ?? 0,
    cholesterol: row.cholesterol ?? 0,
  };
}

function mapFoodItem(row: Record<string, unknown>): FoodItem {
  return {
    id: String(row.id ?? ''),
    station_id: String(row.station_id ?? ''),
    name: String(row.name ?? 'Unknown Item'),
    serving_size: String(row.serving_size ?? row.serving ?? 'N/A'),
    allergens: normalizeStringArray(row.allergens),
    dietary_flags: normalizeStringArray(row.dietary_flags ?? row.dietary_restrictions),
    nutrients: normalizeNutrients(row),
  };
}

export async function getDiningHalls(): Promise<DiningHall[]> {
  const cacheKey = 'dining_halls';
  const tableName = 'dining_halls';
  const memoryCached = getMemoryCache<DiningHall[]>(cacheKey);
  if (memoryCached) return memoryCached;

  const storageCached = await loadCachedValue<DiningHall[]>(cacheKey);
  if (storageCached) return storageCached;

  const { data, error } = await supabase
    .from(tableName)
    .select('id,name')
    .order('name', { ascending: true });

  if (error) {
    const resolvedMessage = error.message || 'Unknown Supabase error';
    const code = 'code' in error ? error.code : undefined;
    const details = 'details' in error ? error.details : undefined;
    const hint = 'hint' in error ? error.hint : undefined;
    console.error('[netNutritionService] getDiningHalls failed:', {
      tableName,
      message: resolvedMessage,
      code,
      details,
      hint,
    });
    throw new Error(resolvedMessage);
  }

  const halls = (data ?? []).map((hall) => ({
    id: String(hall.id),
    name: String(hall.name ?? 'Unknown Hall'),
  }));

  await saveCachedValue(cacheKey, halls);
  return halls;
}

export async function getStationsByHall(hallId: string): Promise<Station[]> {
  const cacheKey = `stations:${hallId}`;
  const memoryCached = getMemoryCache<Station[]>(cacheKey);
  if (memoryCached) return memoryCached;

  const storageCached = await loadCachedValue<Station[]>(cacheKey);
  if (storageCached) return storageCached;

  const { data, error } = await supabase
    .from('stations')
    .select('id,hall_id,name')
    .eq('hall_id', hallId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[netNutritionService] getStationsByHall failed:', { hallId, error });
    throw error;
  }

  const stations = (data ?? []).map((station) => ({
    id: String(station.id),
    hall_id: String(station.hall_id),
    name: String(station.name ?? 'Unknown Station'),
  }));

  await saveCachedValue(cacheKey, stations);
  return stations;
}

export async function getFoodItemsByStation(stationId: string): Promise<FoodItem[]> {
  const cacheKey = `food_items:${stationId}`;
  const memoryCached = getMemoryCache<FoodItem[]>(cacheKey);
  if (memoryCached) return memoryCached;

  const storageCached = await loadCachedValue<FoodItem[]>(cacheKey);
  if (storageCached) return storageCached;

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('station_id', stationId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[netNutritionService] getFoodItemsByStation failed:', { stationId, error });
    throw error;
  }

  const mappedItems = (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
  await saveCachedValue(cacheKey, mappedItems);
  return mappedItems;
}

export async function refreshFromDatabase(): Promise<boolean> {
  await clearAllCachedNutritionData();
  return true;
}
