import { useState, useEffect } from 'react';
import { storageService } from '@/services/storage';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const data = await storageService.getFavorites();
    setFavorites(data);
    setLoading(false);
  };

  const toggleFavorite = async (mealId: string) => {
    if (favorites.includes(mealId)) {
      await storageService.removeFavorite(mealId);
      setFavorites(prev => prev.filter(id => id !== mealId));
    } else {
      await storageService.addFavorite(mealId);
      setFavorites(prev => [...prev, mealId]);
    }
  };

  const isFavorite = (mealId: string) => favorites.includes(mealId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
  };
}
