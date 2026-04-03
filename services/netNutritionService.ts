/**
 * netNutritionService.ts
 *
 * Client-side service that calls the OnSpace Cloud Edge Function
 * which proxies BSU NetNutrition live data.
 * Results are cached in AsyncStorage with TTLs to minimize API calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

const CACHE_PREFIX = '@nn_v2_';
const TTL_SHORT = 30 * 60 * 1000;       // 30 min — locations, categories, items
const TTL_NUTRITION = 24 * 60 * 60 * 1000; // 24 h — nutrition facts rarely change

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NNLocation {
  oid: number;
  name: string;
}

export interface NNCategory {
  oid: number;
  name: string;
}

export interface NNItem {
  oid: number;
  name: string;
  serving: string;
  calories: number;
}

export interface NNNutrition {
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  fiber: number;
  sugar: number;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  ts: number;
}

async function getCached<T>(key: string, ttl: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > ttl) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch { /* ignore */ }
}

// ── Edge Function invocation ──────────────────────────────────────────────────

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('netnutrition', { body });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const text = await error.context?.text();
        msg = `[${statusCode}] ${text || msg}`;
      } catch { /* ignore */ }
    }
    throw new Error(msg);
  }

  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const netNutritionService = {
  /** Fetch all active dining locations from BSU NetNutrition */
  async getLocations(): Promise<NNLocation[]> {
    const cached = await getCached<NNLocation[]>('units', TTL_SHORT);
    // Ignore cached empty arrays so a fixed edge function gets a chance to run
    if (cached && cached.length > 0) return cached;

    const result = await invoke<{ units: NNLocation[] }>({ action: 'units' });
    const units = result.units ?? [];
    if (units.length) await setCached('units', units);
    return units;
  },

  /** Fetch categories/stations for a given dining location */
  async getCategories(unitOid: number): Promise<NNCategory[]> {
    const key = `cats_${unitOid}`;
    const cached = await getCached<NNCategory[]>(key, TTL_SHORT);
    if (cached?.length) return cached;

    const result = await invoke<{ categories: NNCategory[] }>({ action: 'categories', unitOid });
    const cats = result.categories ?? [];
    if (cats.length) await setCached(key, cats);
    return cats;
  },

  /** Fetch menu items for a specific station in a dining location */
  async getItems(unitOid: number, categoryOid: number): Promise<NNItem[]> {
    const key = `items_${unitOid}_${categoryOid}`;
    const cached = await getCached<NNItem[]>(key, TTL_SHORT);
    if (cached?.length) return cached;

    const result = await invoke<{ items: NNItem[] }>({ action: 'items', unitOid, categoryOid });
    const items = result.items ?? [];
    if (items.length) await setCached(key, items);
    return items;
  },

  /** Fetch full nutrition details for a specific menu item */
  async getNutrition(itemOid: number): Promise<NNNutrition> {
    const key = `nutr_${itemOid}`;
    const cached = await getCached<NNNutrition>(key, TTL_NUTRITION);
    if (cached) return cached;

    const result = await invoke<{ nutrition: NNNutrition }>({ action: 'nutrition', itemOid });
    const nutrition = result.nutrition ?? {};
    await setCached(key, nutrition);
    return nutrition as NNNutrition;
  },

  /** Clear all cached data (call on pull-to-refresh) */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch { /* ignore */ }
  },
};

// ── Location metadata (icon, description, hours) keyed by name fragment ───────

interface LocationMeta {
  icon: string;
  description: string;
  hours: string;
}

const META_MAP: Array<[string, LocationMeta]> = [
  ['woodworth', {
    icon: 'restaurant',
    description: 'Sushi, poke bowls, ramen, brick-oven pizza, Italian & homestyle comfort.',
    hours: 'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
  }],
  ['north dining', {
    icon: 'fastfood',
    description: 'Chick-fil-A, BBQ, Bakery, Boar\'s Head Deli & allergen-free station.',
    hours: 'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
  }],
  ['tally', {
    icon: 'local-cafe',
    description: 'Taco Bell, stir fry, homestyle, grill, salad bar & Starbucks.',
    hours: 'Mon–Fri 7:30am–7:30pm · Sat–Sun 9:30am–4pm',
  }],
  ['atrium', {
    icon: 'store',
    description: 'Art & Journalism Building dining with allergen-free options.',
    hours: 'Mon–Thu 11am–7:30pm · Fri 11am–4pm',
  }],
  ['noyer', {
    icon: 'shopping-bag',
    description: 'Salads, burgers, pasta & panini, and comfort food.',
    hours: 'Mon–Fri 11am–8pm',
  }],
  ['tom john', {
    icon: 'nightlife',
    description: 'Kinghorn Hall dining — breakfast through late night.',
    hours: 'Mon–Thu 8:30am–midnight · Fri 8:30am–8:30pm · Sun 5pm–midnight',
  }],
  ['bookmark', {
    icon: 'local-library',
    description: 'Café in Bracken Library serving coffee and light fare.',
    hours: 'Mon–Thu 7:30am–5pm · Fri 7:30am–3pm',
  }],
  ['micro', {
    icon: 'coffee',
    description: 'Quick café options at Studebaker West.',
    hours: 'Mon–Thu 11am–9:30pm · Fri 11am–4pm',
  }],
  ['multicultural', {
    icon: 'icecream',
    description: 'Ice cream shop at the Multicultural Center.',
    hours: 'Mon–Fri 3pm–8pm',
  }],
  ['maka', {
    icon: 'local-pizza',
    description: 'Robotic pizza machine available 24/7 at the Rec Center.',
    hours: 'Available during building hours',
  }],
  ['starship', {
    icon: 'delivery-dining',
    description: 'Autonomous robot food delivery across campus.',
    hours: 'Daily — see app for availability',
  }],
];

export function getLocationMeta(name: string): LocationMeta {
  const lower = name.toLowerCase();
  for (const [key, meta] of META_MAP) {
    if (lower.includes(key)) return meta;
  }
  return {
    icon: 'restaurant',
    description: name,
    hours: 'See BSU Dining website for hours',
  };
}
