import { useState, useEffect } from 'react';
import { storageService, CustomMeal } from '@/services/storage';

export function useCustomMeals() {
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomMeals();
  }, []);

  const loadCustomMeals = async () => {
    const data = await storageService.getCustomMeals();
    setCustomMeals(data);
    setLoading(false);
  };

  const addCustomMeal = async (meal: CustomMeal) => {
    await storageService.addCustomMeal(meal);
    setCustomMeals(prev => [...prev, meal]);
  };

  const removeCustomMeal = async (mealId: string) => {
    await storageService.removeCustomMeal(mealId);
    setCustomMeals(prev => prev.filter(m => m.id !== mealId));
  };

  return {
    customMeals,
    loading,
    addCustomMeal,
    removeCustomMeal,
  };
}
