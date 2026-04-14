import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_FOOD_ITEMS_KEY = '@favorite_food_item_ids';

function sanitizeFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((entry) => String(entry).trim()).filter(Boolean)));
}

export async function getFavoriteFoodItemIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_FOOD_ITEMS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return sanitizeFavoriteIds(parsed);
  } catch (error) {
    console.warn('[favoritesService] Failed to load favorite food item ids:', error);
    return [];
  }
}

export async function toggleFavoriteFoodItem(id: string): Promise<string[]> {
  const safeId = String(id).trim();
  if (!safeId) return getFavoriteFoodItemIds();

  try {
    const current = await getFavoriteFoodItemIds();
    const next = current.includes(safeId) ? current.filter((itemId) => itemId !== safeId) : [...current, safeId];

    await AsyncStorage.setItem(FAVORITE_FOOD_ITEMS_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.warn('[favoritesService] Failed to toggle favorite food item:', { id: safeId, error });
    return getFavoriteFoodItemIds();
  }
}

export async function isFavoriteFoodItem(id: string): Promise<boolean> {
  const current = await getFavoriteFoodItemIds();
  return current.includes(String(id).trim());
}

export async function clearFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAVORITE_FOOD_ITEMS_KEY);
  } catch (error) {
    console.warn('[favoritesService] Failed to clear favorites:', error);
  }
}
