import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/services/supabaseClient';

const CACHE_PREFIX = '@nn_v4_';
const TTL_MENU = 30 * 60 * 1000;
const TTL_NUTRITION = 24 * 60 * 60 * 1000;
const REST_BASE = `${SUPABASE_URL}/rest/v1`;
const FUNCTION_URL = 'https://drtuuuqtgihqvzcripec.supabase.co/functions/v1/netnutrition-scrape';

export interface NNLocation {
  oid: number;
  name: string;
}

export interface NNMenu {
  oid: number;
  name: string;
}

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

interface SupabaseHall {
  id: string;
  name: string;
}

interface SupabaseStation {
  id?: string;
  name?: string;
  dining_halls?: { id?: string; name?: string } | Array<{ id?: string; name?: string }>;
}

interface SupabaseFoodItem {
  id?: string;
  name?: string;
  calories?: number | string | null;
  protein?: number | string | null;
  carbs?: number | string | null;
  fat?: number | string | null;
  saturated_fat?: number | string | null;
  trans_fat?: number | string | null;
  cholesterol?: number | string | null;
  sodium?: number | string | null;
  fiber?: number | string | null;
  sugar?: number | string | null;
  serving_size?: string | null;
  serving?: string | null;
  station_id?: string | null;
  allergens?: unknown;
  stations?: SupabaseStation | SupabaseStation[] | null;
}

interface CacheEntry<T> {
  data: T;
  ts: number;
}

interface ParsedItem {
  oid: number;
  id: string;
  hallOid: number;
  stationOid: number;
  name: string;
  serving: string;
  nutrition: NNNutrition;
}

interface ParsedCourse {
  oid: number;
  id: string;
  name: string;
}

interface ParsedHall {
  oid: number;
  id: string;
  name: string;
  menuOid: number;
  courses: ParsedCourse[];
}

interface ParsedDataset {
  halls: ParsedHall[];
  items: ParsedItem[];
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
  } catch {
    // ignore cache write failures
  }
}

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hashToPositiveInt(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 1;
}

function stationFromRow(row: SupabaseFoodItem): SupabaseStation | null {
  if (!row.stations) return null;
  if (Array.isArray(row.stations)) return row.stations[0] ?? null;
  return row.stations;
}

function hallFromStation(station: SupabaseStation | null): { id: string; name: string } | null {
  if (!station?.dining_halls) return null;
  if (Array.isArray(station.dining_halls)) {
    const hall = station.dining_halls[0];
    if (!hall) return null;
    return { id: hall.id ?? '', name: hall.name ?? '' };
  }
  return {
    id: station.dining_halls.id ?? '',
    name: station.dining_halls.name ?? '',
  };
}

async function fetchDiningHalls(): Promise<SupabaseHall[]> {
  const params = new URLSearchParams({ select: 'id,name', order: 'name.asc' });
  const response = await fetch(`${REST_BASE}/dining_halls?${params.toString()}`, {
    method: 'GET',
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dining halls (${response.status})`);
  }

  const halls = (await response.json()) as SupabaseHall[];
  return Array.isArray(halls) ? halls : [];
}

async function fetchFoodItems(): Promise<SupabaseFoodItem[]> {
  const items = (await getFoodItems()) as SupabaseFoodItem[];
  return Array.isArray(items) ? items : [];
}

export async function getFoodItems() {
  const { data, error } = await supabase.from('food_items').select(`
      *,
      stations (
        name,
        dining_halls ( name )
      )
    `);

  console.log('Supabase data:', data);
  console.log('Supabase error:', error);

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }

  return data ?? [];
}

export async function triggerScrape() {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Scrape failed:', text);
    throw new Error('Scrape failed');
  }

  return await res.json();
}

function buildDataset(halls: SupabaseHall[], rows: SupabaseFoodItem[]): ParsedDataset {
  const hallById = new Map<string, ParsedHall>();

  for (const hall of halls) {
    const hallId = String(hall.id ?? '').trim();
    const hallName = String(hall.name ?? '').trim();
    if (!hallId || !hallName) continue;
    const hallOid = hashToPositiveInt(`hall:${hallId}`);
    hallById.set(hallId, {
      oid: hallOid,
      id: hallId,
      name: hallName,
      menuOid: hashToPositiveInt(`menu:${hallId}:all`),
      courses: [],
    });
  }

  const courseNamesByHall = new Map<number, Map<string, ParsedCourse>>();
  const parsedItems: ParsedItem[] = [];

  for (const row of rows) {
    const itemId = String(row.id ?? '').trim();
    const itemName = String(row.name ?? '').trim();
    if (!itemId || !itemName) continue;

    const station = stationFromRow(row);
    const stationId = String(station?.id ?? row.station_id ?? 'unassigned').trim() || 'unassigned';
    const stationName = String(station?.name ?? 'General').trim() || 'General';

    const stationHall = hallFromStation(station);
    const hallId = String(stationHall?.id ?? '').trim();
    const hallName = String(stationHall?.name ?? '').trim();

    let hall = hallId ? hallById.get(hallId) : undefined;
    if (!hall) {
      const fallbackId = hallId || `derived:${hallName || 'Unknown Hall'}`;
      hall = {
        oid: hashToPositiveInt(`hall:${fallbackId}`),
        id: fallbackId,
        name: hallName || 'Unknown Hall',
        menuOid: hashToPositiveInt(`menu:${fallbackId}:all`),
        courses: [],
      };
      hallById.set(fallbackId, hall);
    }

    let hallCourses = courseNamesByHall.get(hall.oid);
    if (!hallCourses) {
      hallCourses = new Map();
      courseNamesByHall.set(hall.oid, hallCourses);
    }

    let course = hallCourses.get(stationId);
    if (!course) {
      course = {
        oid: hashToPositiveInt(`station:${hall.id}:${stationId}`),
        id: stationId,
        name: stationName,
      };
      hallCourses.set(stationId, course);
      hall.courses.push(course);
    }

    parsedItems.push({
      oid: hashToPositiveInt(`item:${itemId}`),
      id: itemId,
      hallOid: hall.oid,
      stationOid: course.oid,
      name: itemName,
      serving: String(row.serving_size ?? row.serving ?? '1 serving'),
      nutrition: {
        servingSize: String(row.serving_size ?? row.serving ?? '1 serving'),
        calories: toNumber(row.calories),
        protein: toNumber(row.protein),
        carbs: toNumber(row.carbs),
        fat: toNumber(row.fat),
        saturatedFat: toNumber(row.saturated_fat),
        transFat: toNumber(row.trans_fat),
        cholesterol: toNumber(row.cholesterol),
        sodium: toNumber(row.sodium),
        fiber: toNumber(row.fiber),
        sugar: toNumber(row.sugar),
      },
    });
  }

  return {
    halls: Array.from(hallById.values()).sort((a, b) => a.name.localeCompare(b.name)),
    items: parsedItems,
  };
}

async function getDataset(forceRefresh = false): Promise<ParsedDataset> {
  if (!forceRefresh) {
    const cached = await getCached<ParsedDataset>('dataset', TTL_MENU);
    if (cached) return cached;
  }

  const [halls, items] = await Promise.all([fetchDiningHalls(), fetchFoodItems()]);
  const dataset = buildDataset(halls, items);
  await setCached('dataset', dataset);
  return dataset;
}

export const netNutritionService = {
  async refreshDataFromEdge(): Promise<void> {
    await triggerScrape();
  },

  async getLocations(): Promise<NNLocation[]> {
    const data = await getDataset();
    return data.halls.map((hall) => ({ oid: hall.oid, name: hall.name }));
  },

  async getMenus(unitOid: number): Promise<NNMenu[]> {
    const data = await getDataset();
    const hall = data.halls.find((entry) => entry.oid === unitOid);
    if (!hall) return [];
    return [{ oid: hall.menuOid, name: 'All Items' }];
  },

  async getCourses(unitOid: number, menuOid: number): Promise<NNCourse[]> {
    const data = await getDataset();
    const hall = data.halls.find((entry) => entry.oid === unitOid && entry.menuOid === menuOid);
    if (!hall) return [];
    return hall.courses.map((course) => ({ oid: course.oid, name: course.name }));
  },

  async getItems(unitOid: number, menuOid: number, courseOid?: number): Promise<NNItem[]> {
    const data = await getDataset();
    const hall = data.halls.find((entry) => entry.oid === unitOid && entry.menuOid === menuOid);
    if (!hall) return [];

    return data.items
      .filter((item) => item.hallOid === unitOid)
      .filter((item) => (courseOid ? item.stationOid === courseOid : true))
      .map((item) => ({
        oid: item.oid,
        name: item.name,
        serving: item.serving,
        calories: item.nutrition.calories,
      }));
  },

  async getNutrition(itemOid: number): Promise<NNNutrition> {
    const cached = await getCached<NNNutrition>(`nutr_${itemOid}`, TTL_NUTRITION);
    if (cached) return cached;

    const data = await getDataset();
    const item = data.items.find((entry) => entry.oid === itemOid);
    if (!item) {
      return {
        servingSize: '1 serving',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        saturatedFat: 0,
        transFat: 0,
        cholesterol: 0,
        sodium: 0,
        fiber: 0,
        sugar: 0,
      };
    }

    await setCached(`nutr_${itemOid}`, item.nutrition);
    return item.nutrition;
  },

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch {
      // ignore cache clear failures
    }
  },
};

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
