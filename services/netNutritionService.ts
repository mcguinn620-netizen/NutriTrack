import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabaseClient';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const NUTRITION_CACHE_KEY_PREFIX = 'nutrition_cache:';
const NUTRITION_KEY_PREFIXES = [
  'dining_halls',
  'stations',
  'menu_categories',
  'food_items',
];

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
  created_at?: string | null;
}

export interface Station {
  id: string;
  name: string;
  hall_id?: string | null;
  dining_hall_id?: string | null;
  created_at?: string | null;
  dining_hall?: DiningHall | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  station_id?: string | null;
  display_order?: number | null;
  created_at?: string | null;
  station?: Station | null;
}

export interface FoodItem {
  id: string;
  name: string;
  station_id: string;
  category_id?: string | null;
  calories?: number | null;
  serving_size: string;
  ingredients?: string[] | null;
  allergens: string[];
  traits: string[];
  dietary_flags: string[];
  nutrients: Record<string, unknown>;
  micronutrients?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  station?: {
    id: string;
    name: string;
  } | null;
  dining_hall?: {
    id: string;
    name: string;
  } | null;
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
        // fall through to legacy mapping
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

function mapDiningHall(row: Record<string, unknown>): DiningHall {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Hall'),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

function mapStation(row: Record<string, unknown>): Station {
  const diningHallRelation = normalizeObject(row.dining_halls ?? row.dining_hall);

  const mappedHall = diningHallRelation
    ? {
        id: String(diningHallRelation.id ?? ''),
        name: String(diningHallRelation.name ?? 'Unknown Hall'),
        created_at: null,
      }
    : null;

  const hallId = row.hall_id ?? row.dining_hall_id;

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Station'),
    hall_id: hallId == null ? null : String(hallId),
    dining_hall_id: row.dining_hall_id == null ? (hallId == null ? null : String(hallId)) : String(row.dining_hall_id),
    created_at: row.created_at == null ? null : String(row.created_at),
    dining_hall: mappedHall,
  };
}

function mapMenuCategory(row: Record<string, unknown>): MenuCategory {
  const stationRelation = normalizeObject(row.stations ?? row.station);

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Category'),
    station_id: row.station_id == null ? null : String(row.station_id),
    display_order: row.display_order == null ? null : Number(row.display_order),
    created_at: row.created_at == null ? null : String(row.created_at),
    station: stationRelation
      ? {
          id: String(stationRelation.id ?? ''),
          name: String(stationRelation.name ?? 'Unknown Station'),
          hall_id:
            stationRelation.hall_id == null
              ? stationRelation.dining_hall_id == null
                ? null
                : String(stationRelation.dining_hall_id)
              : String(stationRelation.hall_id),
          dining_hall_id:
            stationRelation.dining_hall_id == null
              ? stationRelation.hall_id == null
                ? null
                : String(stationRelation.hall_id)
              : String(stationRelation.dining_hall_id),
          created_at: null,
          dining_hall: null,
        }
      : null,
  };
}

function mapFoodItem(row: Record<string, unknown>): FoodItem {
  const ingredients = normalizeStringArray(row.ingredients);
  const stationRelation = normalizeObject(row.stations ?? row.station);
  const hallRelation = stationRelation
    ? normalizeObject(stationRelation.dining_halls ?? stationRelation.dining_hall)
    : null;

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Item'),
    station_id: String(row.station_id ?? ''),
    category_id: row.category_id == null ? null : String(row.category_id),
    calories: row.calories == null ? null : Number(row.calories),
    serving_size:
      row.serving_size == null
        ? row.serving == null
          ? 'N/A'
          : String(row.serving)
        : String(row.serving_size),
    allergens: normalizeStringArray(row.allergens),
    traits: normalizeStringArray(row.traits ?? row.dietary_flags ?? row.dietary_restrictions),
    dietary_flags: normalizeStringArray(row.dietary_flags ?? row.dietary_restrictions),
    nutrients: normalizeNutrients(row),
    ingredients: ingredients.length ? ingredients : null,
    micronutrients: normalizeObject(row.micronutrients),
    created_at: row.created_at == null ? null : String(row.created_at),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    station: stationRelation
      ? {
          id: String(stationRelation.id ?? ''),
          name: String(stationRelation.name ?? 'Unknown Station'),
        }
      : null,
    dining_hall: hallRelation
      ? {
          id: String(hallRelation.id ?? ''),
          name: String(hallRelation.name ?? 'Unknown Hall'),
        }
      : null,
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
  return fetchWithCacheFallback<DiningHall[]>(
    'dining_halls',
    async () => {
      const { data, error } = await supabase.from('dining_halls').select('*').order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getDiningHalls failed:', error);
        throw new Error(error.message || 'Failed to load dining halls');
      }

      return (data ?? []).map((row) => mapDiningHall(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getStationsResult(options?: QueryOptions): Promise<NetNutritionResult<Station[]>> {
  return fetchWithCacheFallback<Station[]>(
    'stations:all',
    async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('*, dining_halls(id,name)')
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getStations failed:', error);
        throw new Error(error.message || 'Failed to load stations');
      }

      return (data ?? []).map((row) => mapStation(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getStationsByHallResult(
  hallId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<Station[]>> {
  return fetchWithCacheFallback<Station[]>(
    `stations:${hallId}`,
    async () => {
      const byDiningHallId = await supabase
        .from('stations')
        .select('*, dining_halls(id,name)')
        .eq('dining_hall_id', hallId)
        .order('name', { ascending: true });

      if (!byDiningHallId.error) {
        return (byDiningHallId.data ?? []).map((row) => mapStation(row as Record<string, unknown>));
      }

      const byHallId = await supabase
        .from('stations')
        .select('*, dining_halls(id,name)')
        .eq('hall_id', hallId)
        .order('name', { ascending: true });

      if (byHallId.error) {
        console.error('[netNutritionService] getStationsByHall failed:', {
          hallId,
          dining_hall_id_error: byDiningHallId.error,
          hall_id_error: byHallId.error,
        });
        throw new Error(byHallId.error.message || byDiningHallId.error.message || 'Failed to load stations');
      }

      return (byHallId.data ?? []).map((row) => mapStation(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getMenuCategoriesResult(options?: QueryOptions): Promise<NetNutritionResult<MenuCategory[]>> {
  return fetchWithCacheFallback<MenuCategory[]>(
    'menu_categories:all',
    async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*, stations(id,name,hall_id,dining_hall_id)')
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getMenuCategories failed:', error);
        throw new Error(error.message || 'Failed to load menu categories');
      }

      return (data ?? []).map((row) => mapMenuCategory(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getFoodItemsResult(options?: QueryOptions): Promise<NetNutritionResult<FoodItem[]>> {
  return fetchWithCacheFallback<FoodItem[]>(
    'food_items:all',
    async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*, stations(id,name,dining_halls(id,name))')
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getFoodItems failed:', error);
        throw new Error(error.message || 'Failed to load food items');
      }

      return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getFoodItemsByHallResult(
  hallId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<FoodItem[]>> {
  return fetchWithCacheFallback<FoodItem[]>(
    `food_items:hall:${hallId}`,
    async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*, stations!inner(id,name,hall_id,dining_hall_id,dining_halls(id,name))')
        .or(`hall_id.eq.${hallId},dining_hall_id.eq.${hallId}`, { foreignTable: 'stations' })
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getFoodItemsByHall failed:', error);
        throw new Error(error.message || 'Failed to load hall food items');
      }

      return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getFoodItemsByStationResult(
  stationId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<FoodItem[]>> {
  return fetchWithCacheFallback<FoodItem[]>(
    `food_items:station:${stationId}`,
    async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*, stations(id,name,dining_halls(id,name))')
        .eq('station_id', stationId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getFoodItemsByStation failed:', error);
        throw new Error(error.message || 'Failed to load station food items');
      }

      return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
    },
    options,
  );
}

export async function getFoodItemsByCategoryResult(
  categoryId: string,
  options?: QueryOptions,
): Promise<NetNutritionResult<FoodItem[]>> {
  return fetchWithCacheFallback<FoodItem[]>(
    `food_items:category:${categoryId}`,
    async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*, stations(id,name,dining_halls(id,name))')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (error) {
        console.error('[netNutritionService] getFoodItemsByCategory failed:', error);
        throw new Error(error.message || 'Failed to load category food items');
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

export async function getStations(options?: QueryOptions): Promise<Station[]> {
  const result = await getStationsResult(options);
  return result.data;
}

export async function getStationsByHall(hallId: string, options?: QueryOptions): Promise<Station[]> {
  const result = await getStationsByHallResult(hallId, options);
  return result.data;
}

export async function getMenuCategories(options?: QueryOptions): Promise<MenuCategory[]> {
  const result = await getMenuCategoriesResult(options);
  return result.data;
}

export async function getFoodItems(options?: QueryOptions): Promise<FoodItem[]> {
  const result = await getFoodItemsResult(options);
  return result.data;
}

export async function getFoodItemsByHall(hallId: string, options?: QueryOptions): Promise<FoodItem[]> {
  const result = await getFoodItemsByHallResult(hallId, options);
  return result.data;
}

export async function getFoodItemsByStation(stationId: string, options?: QueryOptions): Promise<FoodItem[]> {
  const result = await getFoodItemsByStationResult(stationId, options);
  return result.data;
}

export async function getFoodItemsByCategory(categoryId: string, options?: QueryOptions): Promise<FoodItem[]> {
  const result = await getFoodItemsByCategoryResult(categoryId, options);
  return result.data;
}

export async function triggerScrape(): Promise<boolean> {
  const { error } = await supabase.functions.invoke('netnutrition-scrape');

  if (error) {
    console.error('[netNutritionService] triggerScrape failed:', error);
    throw new Error(error.message || 'Failed to trigger scrape function');
  }

  return true;
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
    .select('*, stations(id,name,dining_halls(id,name))')
    .in('id', uniqueIds);

  if (error) {
    console.error('[netNutritionService] getFoodItemsByIds failed:', error);
    throw new Error(error.message || 'Failed to load selected food items');
  }

  return (data ?? []).map((row) => mapFoodItem(row as Record<string, unknown>));
}
