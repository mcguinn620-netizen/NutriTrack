import { mockMeals, Meal } from './mockData';

interface SearchFilters {
  maxCalories?: number;
  minProtein?: number;
  vegetarianOnly?: boolean;
  veganOnly?: boolean;
  glutenFreeOnly?: boolean;
  location?: string;
}

export const searchService = {
  searchMeals(query: string, filters: SearchFilters = {}): Meal[] {
    const q = query.toLowerCase().trim();
    return mockMeals.filter(meal => {
      const matchesQuery =
        !q ||
        meal.name.toLowerCase().includes(q) ||
        meal.category.toLowerCase().includes(q) ||
        meal.location.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (filters.maxCalories && meal.nutrition.calories > filters.maxCalories) return false;
      if (filters.minProtein && meal.nutrition.protein < filters.minProtein) return false;
      if (filters.vegetarianOnly && !meal.isVegetarian && !meal.isVegan) return false;
      if (filters.veganOnly && !meal.isVegan) return false;
      if (filters.glutenFreeOnly && !meal.isGlutenFree) return false;
      if (filters.location && meal.location !== filters.location) return false;

      return true;
    });
  },

  getTopResults(query: string, limit = 10): Meal[] {
    return this.searchMeals(query).slice(0, limit);
  },
};
