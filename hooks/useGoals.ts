import { useState, useEffect } from 'react';
import { storageService, DailyGoals } from '@/services/storage';

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 225,
  fat: 65,
};

export function useGoals() {
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const data = await storageService.getGoals();
    if (data) {
      setGoals(data);
    }
    setLoading(false);
  };

  const updateGoals = async (newGoals: DailyGoals) => {
    await storageService.saveGoals(newGoals);
    setGoals(newGoals);
  };

  return {
    goals,
    loading,
    updateGoals,
  };
}
