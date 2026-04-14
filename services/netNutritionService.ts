import { supabase } from '@/services/supabaseClient';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

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

function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;

  const isExpired = Date.now() - item.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return item.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
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
  const cached = getCache<DiningHall[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('dining_halls')
    .select('id,name')
    .order('name', { ascending: true });

  if (error) {
    console.error('[netNutritionService] getDiningHalls failed:', error);
    throw error;
  }

  const halls = (data ?? []).map((hall) => ({
    id: String(hall.id),
    name: String(hall.name ?? 'Unknown Hall'),
  }));

  setCache(cacheKey, halls);
  return halls;
}

export async function getStationsByHall(hallId: string): Promise<Station[]> {
  const cacheKey = `stations:${hallId}`;
  const cached = getCache<Station[]>(cacheKey);
  if (cached) return cached;

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

  setCache(cacheKey, stations);
  return stations;
}

export async function getFoodItemsByStation(stationId: string): Promise<FoodItem[]> {
  const cacheKey = `food_items:${stationId}`;
  const cached = getCache<FoodItem[]>(cacheKey);
  if (cached) return cached;

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
  setCache(cacheKey, mappedItems);
  return mappedItems;
}

export async function refreshFromDatabase(): Promise<boolean> {
  cache.clear();
  return true;
}
