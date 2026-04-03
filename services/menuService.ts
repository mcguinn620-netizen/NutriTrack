/**
 * menuService.ts
 *
 * Manages weekly menu state: tracks last-updated timestamp,
 * simulates a weekly menu refresh (rotates daily specials),
 * and persists "last checked" metadata.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMeals, Meal, DiningLocation, diningLocations } from './mockData';

const MENU_LAST_UPDATED_KEY = '@menu_last_updated';
const MENU_WEEK_KEY = '@menu_week_index';

export interface MenuStatus {
  lastUpdated: string | null;        // ISO date string
  weekIndex: number;                  // 0–3, rotates weekly specials
  hasUpdate: boolean;                 // true when a new week has started
}

// Weekly specials rotation — each week surfaces a different subset of featured meals
// per location. Index 0–3.
const WEEKLY_SPECIALS_ROTATION: Record<string, string[]>[] = [
  // Week A
  {
    woodworth: ['w-cz-1', 'w-d-5', 'w-s-4', 'w-g-1'],
    northdining: ['nd-cfa-1', 'nd-bbq-1', 'nd-h-4', 'nd-i-2'],
    tally: ['tl-tb-2', 'tl-sf-1', 'tl-gr-1', 'tl-ss-5'],
    atrium: ['at-e-1', 'at-v-1', 'at-g-2'],
    noyer: ['ny-bsp-1', 'ny-pp-1', 'ny-mc-1'],
    tomjohn: ['tj-g-1', 'tj-ln-2', 'tj-hm-3'],
  },
  // Week B
  {
    woodworth: ['w-cz-3', 'w-d-4', 'w-s-6', 'w-g-3'],
    northdining: ['nd-cfa-5', 'nd-bbq-2', 'nd-h-5', 'nd-i-3'],
    tally: ['tl-tb-3', 'tl-sf-3', 'tl-gr-3', 'tl-ss-3'],
    atrium: ['at-e-2', 'at-v-2', 'at-g-1'],
    noyer: ['ny-bsp-2', 'ny-pp-3', 'ny-mc-2'],
    tomjohn: ['tj-br-1', 'tj-hm-2', 'tj-ln-1'],
  },
  // Week C
  {
    woodworth: ['w-cz-6', 'w-d-6', 'w-s-5', 'w-g-2'],
    northdining: ['nd-cfa-3', 'nd-bbq-3', 'nd-h-1', 'nd-i-1'],
    tally: ['tl-tb-6', 'tl-sf-4', 'tl-gr-6', 'tl-ss-6'],
    atrium: ['at-e-3', 'at-v-3', 'at-g-2'],
    noyer: ['ny-bsp-3', 'ny-cg-2', 'ny-mc-1'],
    tomjohn: ['tj-br-3', 'tj-g-3', 'tj-hm-1'],
  },
  // Week D
  {
    woodworth: ['w-cz-8', 'w-d-1', 'w-s-7', 'w-g-4'],
    northdining: ['nd-cfa-7', 'nd-bbq-4', 'nd-h-8', 'nd-i-4'],
    tally: ['tl-tb-1', 'tl-sf-2', 'tl-gr-2', 'tl-ss-1'],
    atrium: ['at-e-4', 'at-v-1', 'at-g-1'],
    noyer: ['ny-bsp-1', 'ny-pp-2', 'ny-cg-1'],
    tomjohn: ['tj-br-2', 'tj-g-2', 'tj-hm-3'],
  },
];

// Compute week index from current date (ISO week → mod 4)
function getCurrentWeekIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7
  );
  return weekNum % 4;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export const menuService = {
  async getStatus(): Promise<MenuStatus> {
    try {
      const [lastUpdated, storedWeek] = await Promise.all([
        AsyncStorage.getItem(MENU_LAST_UPDATED_KEY),
        AsyncStorage.getItem(MENU_WEEK_KEY),
      ]);

      const currentWeekStart = getMondayOfCurrentWeek();
      const weekIndex = getCurrentWeekIndex();
      const hasUpdate = lastUpdated !== currentWeekStart;

      return {
        lastUpdated,
        weekIndex: storedWeek ? parseInt(storedWeek, 10) : weekIndex,
        hasUpdate,
      };
    } catch {
      return { lastUpdated: null, weekIndex: 0, hasUpdate: true };
    }
  },

  async markUpdated(): Promise<{ weekIndex: number; lastUpdated: string }> {
    const currentWeekStart = getMondayOfCurrentWeek();
    const weekIndex = getCurrentWeekIndex();
    await Promise.all([
      AsyncStorage.setItem(MENU_LAST_UPDATED_KEY, currentWeekStart),
      AsyncStorage.setItem(MENU_WEEK_KEY, String(weekIndex)),
    ]);
    return { weekIndex, lastUpdated: currentWeekStart };
  },

  getWeeklySpecials(locationId: string, weekIndex: number): Meal[] {
    const rotation = WEEKLY_SPECIALS_ROTATION[weekIndex % 4];
    const ids = rotation[locationId] ?? [];
    return ids.map(id => mockMeals.find(m => m.id === id)).filter(Boolean) as Meal[];
  },

  getFormattedLastUpdated(isoDate: string | null): string {
    if (!isoDate) return 'Never synced';
    const d = new Date(isoDate + 'T12:00:00');
    return `Week of ${formatDate(d)}`;
  },

  getNextUpdateDate(): string {
    const now = new Date();
    const day = now.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilMonday);
    return formatDate(next);
  },

  getAllLocations(): DiningLocation[] {
    return diningLocations;
  },

  getMealsForLocation(locationId: string, weekIndex: number): {
    allMeals: Meal[];
    weeklySpecials: Meal[];
    categories: string[];
  } {
    const location = diningLocations.find(l => l.id === locationId);
    if (!location) return { allMeals: [], weeklySpecials: [], categories: [] };

    const allMeals = mockMeals.filter(m => m.location === location.name);
    const weeklySpecials = this.getWeeklySpecials(locationId, weekIndex);

    return {
      allMeals,
      weeklySpecials,
      categories: location.categories,
    };
  },
};
