/**
 * netNutritionService.ts
 *
 * Client-side service calling the OnSpace Cloud Edge Function
 * which proxies BSU NetNutrition (CBORD) live data.
 *
 * API flow (from CBORD_NN_UI.js):
 *   units → menus (per unit) → courses (per menu) → items (per course) → nutrition (per item)
 *
 * Results are cached in AsyncStorage with TTLs.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

const CACHE_PREFIX = '@nn_v3_';
const TTL_MENU = 30 * 60 * 1000;           // 30 min — locations, menus, courses, items
const TTL_NUTRITION = 24 * 60 * 60 * 1000; // 24 h  — nutrition facts
const SCRAPE_CACHE_KEY = 'scrape_payload';
const NETNUTRITION_SOURCE_URL = 'http://netnutrition.bsu.edu/NetNutrition/1#';
const NETNUTRITION_FUNCTION_URL = 'https://upjotaeatvessmbrorgx.supabase.co/functions/v1/netnutrition';
const NETNUTRITION_PUBLISHABLE_KEY = 'sb_publishable_hFKJ7yVVcObiQ_A4ukfUjw_raclp5di';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NNLocation {
  oid: number;
  name: string;
}

/** A menu period: Breakfast, Lunch, Dinner, etc. */
export interface NNMenu {
  oid: number;
  name: string;
}

/** A course/station within a menu: Entrees, Sides, Grill, Pizza, etc. */
export interface NNCourse {
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

interface NNTrait {
  oid: number;
  name: string;
}

interface NNScrapedItem {
  oid: number;
  name: string;
  traits?: NNTrait[];
  nutrition?: Record<string, string>;
  nutritionLabel?: Record<string, string>;
  nutritionGrid?: Record<string, string>;
}

interface NNScrapedMenu {
  oid: number;
  name: string;
  items?: NNScrapedItem[];
}

interface NNScrapedUnit {
  oid: number;
  name: string;
  source?: 'unit' | 'child-unit';
  menus?: NNScrapedMenu[];
}

interface NNScrapePayload {
  units: NNScrapedUnit[];
  generatedAt?: string;
  sourceUrl?: string;
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
  console.log('[netNutritionService.invoke] request', body);
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
    console.error('[netNutritionService.invoke] error', { body, message: msg });
    throw new Error(msg);
  }

  if (data?.error) throw new Error(data.error);
  console.log('[netNutritionService.invoke] response ok', {
    action: body.action,
    keys: data ? Object.keys(data) : [],
  });
  return data as T;
}

async function invokeDirectFetch<T>(body: Record<string, unknown>): Promise<T> {
  console.log('[netNutritionService.invokeDirectFetch] request', {
    url: NETNUTRITION_FUNCTION_URL,
    body,
  });
  const response = await fetch(NETNUTRITION_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: NETNUTRITION_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  console.log('[netNutritionService.invokeDirectFetch] response', {
    status: response.status,
    ok: response.ok,
    keys: json && typeof json === 'object' ? Object.keys(json as Record<string, unknown>) : [],
  });
  if (!response.ok || json?.error) {
    throw new Error(json?.error || `[${response.status}] ${text}`);
  }
  return json as T;
}

function normalizeScrapePayload(payload: unknown): NNScrapePayload {
  const obj = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
  const units = Array.isArray(obj.units) ? obj.units : [];
  return {
    units: units as NNScrapedUnit[],
    generatedAt: typeof obj.generatedAt === 'string' ? obj.generatedAt : undefined,
    sourceUrl: typeof obj.sourceUrl === 'string' ? obj.sourceUrl : undefined,
  };
}

async function loadScrapedPayload(): Promise<NNScrapePayload> {
  const cached = await getCached<NNScrapePayload>(SCRAPE_CACHE_KEY, TTL_MENU);
  if (cached?.units?.length) return cached;

  const requestBody = { url: NETNUTRITION_SOURCE_URL };

  let payload = normalizeScrapePayload(
    await invokeDirectFetch<NNScrapePayload>(requestBody),
  );

  if (!payload?.units?.length) {
    try {
      payload = normalizeScrapePayload(
        await invoke<NNScrapePayload>(requestBody),
      );
    } catch (err) {
      console.warn('[netNutritionService] fallback invoke failed', err);
    }
  }

  if (!payload?.units) payload = { units: [] };
  console.log('[netNutritionService.loadScrapedPayload] payload ready', {
    units: payload.units.length,
    generatedAt: payload.generatedAt,
  });
  await setCached(SCRAPE_CACHE_KEY, payload);
  return payload;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const netNutritionService = {
  /** Fetch all active dining locations from BSU NetNutrition */
  async getLocations(): Promise<NNLocation[]> {
    const cached = await getCached<NNLocation[]>('units', TTL_MENU);
    if (cached && cached.length > 0) {
      console.log('[netNutritionService.getLocations] cache hit', { count: cached.length });
      return cached;
    }

    const result = await loadScrapedPayload();
    const units = (result.units ?? []).map((unit) => ({ oid: unit.oid, name: unit.name }));
    console.log('[netNutritionService.getLocations] fetched', { count: units.length });
    if (units.length) await setCached('units', units);
    return units;
  },

  /** Fetch menu periods (Breakfast, Lunch, Dinner…) for a dining location */
  async getMenus(unitOid: number): Promise<NNMenu[]> {
    const key = `menus_${unitOid}`;
    const cached = await getCached<NNMenu[]>(key, TTL_MENU);
    if (cached?.length) {
      console.log('[netNutritionService.getMenus] cache hit', { unitOid, count: cached.length });
      return cached;
    }

    const result = await loadScrapedPayload();
    const unit = (result.units ?? []).find((entry) => entry.oid === unitOid);
    const menus = (unit?.menus ?? []).map((menu) => ({ oid: menu.oid, name: menu.name }));
    console.log('[netNutritionService.getMenus] fetched', { unitOid, count: menus.length });
    if (menus.length) await setCached(key, menus);
    return menus;
  },

  /** Fetch courses/stations within a menu period */
  async getCourses(unitOid: number, menuOid: number): Promise<NNCourse[]> {
    const key = `courses_${unitOid}_${menuOid}`;
    const cached = await getCached<NNCourse[]>(key, TTL_MENU);
    if (cached?.length) {
      console.log('[netNutritionService.getCourses] cache hit', {
        unitOid,
        menuOid,
        count: cached.length,
      });
      return cached;
    }

    const result = await loadScrapedPayload();
    const unit = (result.units ?? []).find((entry) => entry.oid === unitOid);
    const menu = (unit?.menus ?? []).find((entry) => entry.oid === menuOid);
    const traits = new Map<number, string>();
    for (const item of menu?.items ?? []) {
      for (const trait of item.traits ?? []) traits.set(trait.oid, trait.name);
    }
    const courses = Array.from(traits.entries()).map(([oid, name]) => ({ oid, name }));
    console.log('[netNutritionService.getCourses] fetched', { unitOid, menuOid, count: courses.length });
    if (courses.length) await setCached(key, courses);
    return courses;
  },

  /** Fetch menu items for a course (or the whole menu if courseOid omitted) */
  async getItems(
    unitOid: number,
    menuOid: number,
    courseOid?: number,
  ): Promise<NNItem[]> {
    const key = `items_${unitOid}_${menuOid}_${courseOid ?? 'all'}`;
    const cached = await getCached<NNItem[]>(key, TTL_MENU);
    if (cached?.length) {
      console.log('[netNutritionService.getItems] cache hit', {
        unitOid,
        menuOid,
        courseOid: courseOid ?? null,
        count: cached.length,
      });
      return cached;
    }

    const result = await loadScrapedPayload();
    const unit = (result.units ?? []).find((entry) => entry.oid === unitOid);
    const menu = (unit?.menus ?? []).find((entry) => entry.oid === menuOid);
    const items = (menu?.items ?? [])
      .filter((item) => {
        if (!courseOid) return true;
        return (item.traits ?? []).some((trait) => trait.oid === courseOid);
      })
      .map((item) => ({
        oid: item.oid,
        name: item.name,
        serving: item.nutrition?.['Serving Size'] ?? item.nutritionLabel?.['Serving Size'] ?? '1 serving',
        calories: Number(item.nutrition?.Calories ?? item.nutritionLabel?.Calories ?? 0),
      }));
    console.log('[netNutritionService.getItems] fetched', {
      unitOid,
      menuOid,
      courseOid: courseOid ?? null,
      count: items.length,
    });
    if (items.length) await setCached(key, items);
    return items;
  },

  /** Fetch full nutrition details for a specific menu item */
  async getNutrition(itemOid: number, menuOid?: number): Promise<NNNutrition> {
    const key = `nutr_${itemOid}`;
    const cached = await getCached<NNNutrition>(key, TTL_NUTRITION);
    if (cached) {
      console.log('[netNutritionService.getNutrition] cache hit', { itemOid, menuOid: menuOid ?? null });
      return cached;
    }

    const result = await loadScrapedPayload();
    const allItems = (result.units ?? [])
      .flatMap((unit) => unit.menus ?? [])
      .flatMap((menu) => menu.items ?? []);
    const item = allItems.find((entry) => entry.oid === itemOid);
    const label = item?.nutrition ?? item?.nutritionLabel ?? {};
    const nutrition: Partial<NNNutrition> = {
      servingSize: label['Serving Size'] ?? '1 serving',
      calories: Number(label['Calories'] ?? 0),
      fat: Number(label['Total Fat'] ?? 0),
      saturatedFat: Number(label['Saturated Fat'] ?? 0),
      transFat: Number(label['Trans Fat'] ?? 0),
      cholesterol: Number(label['Cholesterol'] ?? 0),
      sodium: Number(label['Sodium'] ?? 0),
      carbs: Number(label['Total Carbohydrate'] ?? 0),
      fiber: Number(label['Dietary Fiber'] ?? 0),
      sugar: Number(label['Total Sugars'] ?? 0),
      protein: Number(label['Protein'] ?? 0),
    };
    console.log('[netNutritionService.getNutrition] fetched', {
      itemOid,
      menuOid: menuOid ?? null,
      keys: Object.keys(nutrition),
    });
    await setCached(key, nutrition);
    return nutrition as NNNutrition;
  },

  /** Clear all cached data (call on pull-to-refresh) */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      console.log('[netNutritionService.clearCache] clearing keys', { count: toRemove.length });
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
  [
    'woodworth',
    {
      icon: 'restaurant',
      description:
        'Sushi, poke bowls, ramen, brick-oven pizza, Italian & homestyle comfort.',
      hours:
        'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
    },
  ],
  [
    'north dining',
    {
      icon: 'fastfood',
      description:
        "Chick-fil-A, BBQ, Bakery, Boar's Head Deli & allergen-free station.",
      hours:
        'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
    },
  ],
  [
    'north',
    {
      icon: 'fastfood',
      description:
        "Chick-fil-A, BBQ, Bakery, Boar's Head Deli & allergen-free station.",
      hours:
        'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
    },
  ],
  [
    'tally',
    {
      icon: 'local-cafe',
      description: 'Taco Bell, stir fry, homestyle, grill, salad bar & Starbucks.',
      hours: 'Mon–Fri 7:30am–7:30pm · Sat–Sun 9:30am–4pm',
    },
  ],
  [
    'atrium',
    {
      icon: 'store',
      description: 'Art & Journalism Building dining with allergen-free options.',
      hours: 'Mon–Thu 11am–7:30pm · Fri 11am–4pm',
    },
  ],
  [
    'noyer',
    {
      icon: 'shopping-bag',
      description: 'Salads, burgers, pasta & panini, and comfort food.',
      hours: 'Mon–Fri 11am–8pm',
    },
  ],
  [
    'tom john',
    {
      icon: 'nightlife',
      description: 'Kinghorn Hall dining — breakfast through late night.',
      hours:
        'Mon–Thu 8:30am–midnight · Fri 8:30am–8:30pm · Sun 5pm–midnight',
    },
  ],
  [
    'bookmark',
    {
      icon: 'local-library',
      description: 'Café in Bracken Library serving coffee and light fare.',
      hours: 'Mon–Thu 7:30am–5pm · Fri 7:30am–3pm',
    },
  ],
  [
    'micro',
    {
      icon: 'coffee',
      description: 'Quick café options at Studebaker West.',
      hours: 'Mon–Thu 11am–9:30pm · Fri 11am–4pm',
    },
  ],
  [
    'multicultural',
    {
      icon: 'icecream',
      description: 'Ice cream shop at the Multicultural Center.',
      hours: 'Mon–Fri 3pm–8pm',
    },
  ],
  [
    'maka',
    {
      icon: 'local-pizza',
      description: 'Robotic pizza machine available 24/7 at the Rec Center.',
      hours: 'Available during building hours',
    },
  ],
  [
    'starship',
    {
      icon: 'delivery-dining',
      description: 'Autonomous robot food delivery across campus.',
      hours: 'Daily — see app for availability',
    },
  ],
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
