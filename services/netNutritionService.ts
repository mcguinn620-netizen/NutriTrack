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

export interface NetNutritionResult<T> {
  data: T;
  timestamp: number | null;
  isOfflineFallback: boolean;
}

interface QueryOptions {
  forceRefresh?: boolean;
}

export interface DiningHall {
  id: string;
  name: string;
  unit_oid?: number | null;
  created_at?: string | null;
}

export interface Station {
  id: string;
  dining_hall_id: string;
  name: string;
  unit_oid?: number | null;
  created_at?: string | null;
}

export interface FoodItem {
  id: string;
  station_id: string;
  name: string;
  detail_oid?: number | null;
  serving_size: string;
  allergens: string[];
  dietary_flags: string[];
  nutrients: Record<string, unknown>;
  ingredients?: string[] | null;
  micronutrients?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_TTL;
}

function getStorageKey(cacheKey: string): string {
  return `${NUTRITION_CACHE_KEY_PREFIX}${cacheKey}`;
}

function shouldManageNutritionKey(cacheKey: string): boolean {
  return NUTRITION_KEY_PREFIXES.some((prefix) => cacheKey.startsWith(prefix));
}

function getMemoryCacheEntry<T>(key: string): CachedPayload<T> | null {
  const item = cache.get(key);
  if (!item) return null;

  if (isExpired(item.timestamp)) {
    cache.delete(key);
    return null;
  }

  return {
    data: item.data as T,
    timestamp: item.timestamp,
  };
}

function setMemoryCache<T>(key: string, data: T, timestamp = Date.now()): void {
  cache.set(key, {
    data,
    timestamp,
  });
}

async function loadCachedPayload<T>(key: string): Promise<CachedPayload<T> | null> {
  if (!shouldManageNutritionKey(key)) {
    return null;
  }

  const memoryCached = getMemoryCacheEntry<T>(key);
  if (memoryCached) {
    return memoryCached;
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
    return parsed;
  } catch (error) {
    console.warn('[netNutritionService] Failed to load cache value:', { key, error });
    return null;
  }
}

export async function loadCachedValue<T>(key: string): Promise<T | null> {
  const payload = await loadCachedPayload<T>(key);
  return payload?.data ?? null;
}

export async function getCacheTimestamp(key: string): Promise<number | null> {
  const payload = await loadCachedPayload<unknown>(key);
  return payload?.timestamp ?? null;
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
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return normalizeStringArray(parsed);
        }
      } catch {
        // Fall back to comma-separated parsing
      }
    }

    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}


function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

function normalizeNutrients(row: Record<string, unknown>): Record<string, unknown> {
  const fromJson = row.nutrients;
  if (fromJson && typeof fromJson === 'object' && !Array.isArray(fromJson)) {
    return fromJson as Record<string, unknown>;
  }
  if (typeof fromJson === 'string') {
    const trimmed = fromJson.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Fall back to legacy nutrient mapping
      }
    }
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
  const ingredients = normalizeStringArray(row.ingredients);

  return {
    id: String(row.id ?? ''),
    station_id: String(row.station_id ?? ''),
    name: String(row.name ?? 'Unknown Item'),
    detail_oid: row.detail_oid == null ? null : Number(row.detail_oid),
    serving_size: String(row.serving_size ?? row.serving ?? 'N/A'),
    allergens: normalizeStringArray(row.allergens),
    dietary_flags: normalizeStringArray(row.dietary_flags ?? row.dietary_restrictions),
    nutrients: normalizeNutrients(row),
    ingredients: ingredients.length ? ingredients : null,
    micronutrients: normalizeObject(row.micronutrients),
    created_at: row.created_at == null ? null : String(row.created_at),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
  };
}

async function fetchWithCacheFallback<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: QueryOptions,
): Promise<NetNutritionResult<T>> {
  const cached = await loadCachedPayload<T>(cacheKey);
  if (cached && !options?.forceRefresh) {
    return {
      data: cached.data,
      timestamp: cached.timestamp,
      isOfflineFallback: false,
    };
  }

  try {
    const data = await fetcher();
    await saveCachedValue(cacheKey, data);
    const timestamp = await getCacheTimestamp(cacheKey);

    return {
      data,
      timestamp,
      isOfflineFallback: false,
    };
  } catch (error) {
    if (cached) {
      console.warn('[netNutritionService] Returning cached fallback after fetch failure:', { cacheKey, error });
      return {
        data: cached.data,
        timestamp: cached.timestamp,
        isOfflineFallback: true,
      };
    }

    throw error;
  }
}

export async function getDiningHallsResult(options?: QueryOptions): Promise<NetNutritionResult<DiningHall[]>> {
  const tableName = 'dining_halls';
  const cacheKey = 'dining_halls';

  return fetchWithCacheFallback<DiningHall[]>(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('id,name,unit_oid,created_at')
        .order('name', { ascending: true });

      if (error) {
        const resolvedMessage = error.message || 'Unknown Supabase error';
        const code = 'code' in error ? error.code : undefined;
        const details = 'details' in error ? error.details : undefined;
        const hint = 'hint' in error ? error.hint : undefined;
        console.error('[netNutritionService] getDiningHalls failed:', {
          tableName,
          filterColumn: null,
          filterValue: null,
          error,
          message: resolvedMessage,
          code,
          details,
          hint,
        });
        throw new Error(resolvedMessage);
      }

      return (data ?? []).map((hall) => ({
        id: String(hall.id),
        name: String(hall.name ?? 'Unknown Hall'),
        unit_oid: hall.unit_oid == null ? null : Number(hall.unit_oid),
        created_at: hall.created_at == null ? null : String(hall.created_at),
      }));
    },
    options,
  );
}

export async function getStationsByHallResult(
  hallId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<Station[]>> {
  const cacheKey = `stations:${hallId}`;

  return fetchWithCacheFallback<Station[]>(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('id,dining_hall_id,name,unit_oid,created_at')
        .eq('dining_hall_id', hallId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getStationsByHall failed:', {
          tableName: 'stations',
          filterColumn: 'dining_hall_id',
          filterValue: hallId,
          error,
        });
        throw error;
      }

      return (data ?? []).map((station) => ({
        id: String(station.id),
        dining_hall_id: String(station.dining_hall_id),
        name: String(station.name ?? 'Unknown Station'),
        unit_oid: station.unit_oid == null ? null : Number(station.unit_oid),
        created_at: station.created_at == null ? null : String(station.created_at),
      }));
    },
    options,
  );
}

export async function getFoodItemsByStationResult(
  stationId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<FoodItem[]>> {
  const cacheKey = `food_items:${stationId}`;

  return fetchWithCacheFallback<FoodItem[]>(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('station_id', stationId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getFoodItemsByStation failed:', {
          tableName: 'food_items',
          filterColumn: 'station_id',
          filterValue: stationId,
          error,
        });
        throw error;
      }

      return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getDiningHalls(options?: QueryOptions): Promise<DiningHall[]> {
  const result = await getDiningHallsResult(options);
  return result.data;
}

export async function getStationsByHall(hallId: string, options?: QueryOptions): Promise<Station[]> {
  const result = await getStationsByHallResult(hallId, options);
  return result.data;
}

export async function getFoodItemsByStation(stationId: string, options?: QueryOptions): Promise<FoodItem[]> {
  const result = await getFoodItemsByStationResult(stationId, options);
  return result.data;
}

export async function refreshFromDatabase(): Promise<boolean> {
  await clearAllCachedNutritionData();
  return true;
}

export async function getFoodItemsByIds(ids: string[]): Promise<FoodItem[]> {
  const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .in('id', uniqueIds);

  if (error) {
    console.error('[netNutritionService] getFoodItemsByIds failed:', error);
    throw error;
  }

  return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
}
