import { useState, useEffect } from 'react';
import { storageService, LoggedMeal } from '@/services/storage';

export function useDailyLog(date: string) {
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeals();
  }, [date]);

  const loadMeals = async () => {
    setLoading(true);
    const data = await storageService.getDailyLog(date);
    setMeals(data);
    setLoading(false);
  };

  const addMeal = async (meal: LoggedMeal) => {
    await storageService.logMeal(meal);
    await loadMeals();
  };

  const removeMeal = async (timestamp: string) => {
    await storageService.removeMealLog(date, timestamp);
    await loadMeals();
  };

  const getMealsByTime = (mealTime: LoggedMeal['mealTime']) => {
    return meals.filter(meal => meal.mealTime === mealTime);
  };

  const getTotals = () => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.nutrition.calories,
        protein: acc.protein + meal.nutrition.protein,
        carbs: acc.carbs + meal.nutrition.carbs,
        fat: acc.fat + meal.nutrition.fat,
        fiber: acc.fiber + meal.nutrition.fiber,
        sugar: acc.sugar + meal.nutrition.sugar,
        sodium: acc.sodium + meal.nutrition.sodium,
        cholesterol: acc.cholesterol + meal.nutrition.cholesterol,
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        cholesterol: 0,
      }
    );
  };

  return {
    meals,
    loading,
    addMeal,
    removeMeal,
    getMealsByTime,
    getTotals,
    refresh: loadMeals,
  };
}
