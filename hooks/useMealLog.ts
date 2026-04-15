import { useCallback, useEffect, useMemo, useState } from 'react';
import { FoodItem } from '@/services/netNutritionService';
import { MealCategory, MealLogEntry, mealLogService } from '@/services/mealLogService';

const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

function getDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function getWeekRange(date = new Date()): { startDate: string; endDate: string } {
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startDate: getDateString(start), endDate: getDateString(end) };
}

export function useMealLog(date = getDateString()) {
  const [entries, setEntries] = useState<MealLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await mealLogService.getByDate(date);
    setEntries(data);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addFoodItem = useCallback(
    async (item: FoodItem, category: MealCategory, options?: { quantity?: number; source?: MealLogEntry['source']; stationName?: string }) => {
      await mealLogService.logFoodItem({ item, category, quantity: options?.quantity, source: options?.source, stationName: options?.stationName, date });
      await refresh();
    },
    [date, refresh],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      await mealLogService.removeEntry(entryId);
      await refresh();
    },
    [refresh],
  );

  const byCategory = useMemo(() => {
    return CATEGORIES.reduce<Record<MealCategory, MealLogEntry[]>>((acc, category) => {
      acc[category] = entries.filter((entry) => entry.category === category);
      return acc;
    }, { breakfast: [], lunch: [], dinner: [], snacks: [] });
  }, [entries]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const quantity = entry.quantity;
        acc.calories += entry.food.nutrients.calories * quantity;
        acc.protein += entry.food.nutrients.protein * quantity;
        acc.carbs += entry.food.nutrients.carbs * quantity;
        acc.fat += entry.food.nutrients.fat * quantity;
        acc.fiber += entry.food.nutrients.fiber * quantity;
        acc.sugar += entry.food.nutrients.sugar * quantity;
        acc.sodium += entry.food.nutrients.sodium * quantity;
        acc.cholesterol += entry.food.nutrients.cholesterol * quantity;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 },
    );
  }, [entries]);

  return { entries, byCategory, totals, loading, refresh, addFoodItem, removeEntry };
}

export function useWeeklyMealLog(anchorDate = new Date()) {
  const [{ startDate, endDate }, setRange] = useState(() => getWeekRange(anchorDate));
  const [entries, setEntries] = useState<MealLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await mealLogService.getByDateRange(startDate, endDate);
    setEntries(data);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    setRange(getWeekRange(anchorDate));
  }, [anchorDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, refresh, startDate, endDate };
}
