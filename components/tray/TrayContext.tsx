import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { FoodItem } from '@/services/netNutritionService';

interface TrayEntry {
  item: FoodItem;
  quantity: number;
}

interface TrayTotals {
  itemCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hasCalories: boolean;
  hasProtein: boolean;
  hasCarbs: boolean;
  hasFat: boolean;
}

interface TrayContextValue {
  entries: TrayEntry[];
  totals: TrayTotals;
  addItem: (item: FoodItem) => void;
  removeItem: (itemId: string) => void;
  clearTray: () => void;
  hasItem: (itemId: string) => boolean;
}

const TrayContext = createContext<TrayContextValue | undefined>(undefined);

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

function getMetric(item: FoodItem, keys: string[]): { value: number; found: boolean } {
  const nutrients = item.nutrients ?? {};
  for (const [key, value] of Object.entries(nutrients)) {
    if (keys.includes(key.toLowerCase())) {
      const parsed = toNumber(value);
      return { value: parsed, found: true };
    }
  }
  return { value: 0, found: false };
}

export function TrayProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<TrayEntry[]>([]);

  const addItem = (item: FoodItem) => {
    setEntries((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) => (entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setEntries((prev) => {
      const existing = prev.find((entry) => entry.item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((entry) => entry.item.id !== itemId);
      }
      return prev.map((entry) => (entry.item.id === itemId ? { ...entry, quantity: entry.quantity - 1 } : entry));
    });
  };

  const clearTray = () => setEntries([]);
  const hasItem = (itemId: string) => entries.some((entry) => entry.item.id === itemId);

  const totals = useMemo(() => {
    return entries.reduce<TrayTotals>(
      (acc, entry) => {
        const quantity = entry.quantity;
        acc.itemCount += quantity;
        const calories = getMetric(entry.item, ['calories']);
        const protein = getMetric(entry.item, ['protein']);
        const carbs = getMetric(entry.item, ['carbs', 'carbohydrates']);
        const fat = getMetric(entry.item, ['fat', 'total fat']);

        acc.calories += calories.value * quantity;
        acc.protein += protein.value * quantity;
        acc.carbs += carbs.value * quantity;
        acc.fat += fat.value * quantity;
        acc.hasCalories = acc.hasCalories || calories.found;
        acc.hasProtein = acc.hasProtein || protein.found;
        acc.hasCarbs = acc.hasCarbs || carbs.found;
        acc.hasFat = acc.hasFat || fat.found;
        return acc;
      },
      {
        itemCount: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        hasCalories: false,
        hasProtein: false,
        hasCarbs: false,
        hasFat: false,
      },
    );
  }, [entries]);

  return <TrayContext.Provider value={{ entries, totals, addItem, removeItem, clearTray, hasItem }}>{children}</TrayContext.Provider>;
}

export function useTray() {
  const context = useContext(TrayContext);
  if (!context) {
    throw new Error('useTray must be used within a TrayProvider');
  }
  return context;
}
