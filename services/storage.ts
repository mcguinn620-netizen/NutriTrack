import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@favorites';
const DAILY_LOG_KEY = '@daily_log';
const GOALS_KEY = '@goals';
const CUSTOM_MEALS_KEY = '@custom_meals';

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CustomMeal {
  id: string;
  name: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
  };
  servingSize: string;
  createdAt: string;
}

export interface LoggedMeal {
  mealId: string;
  mealName: string;
  mealTime: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
  };
  timestamp: string;
  date: string;
}

export const storageService = {
  async getFavorites(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  },

  async addFavorite(mealId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      if (!favorites.includes(mealId)) {
        favorites.push(mealId);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  },

  async removeFavorite(mealId: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const updated = favorites.filter(id => id !== mealId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  },

  async getDailyLog(date: string): Promise<LoggedMeal[]> {
    try {
      const key = `${DAILY_LOG_KEY}_${date}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading daily log:', error);
      return [];
    }
  },

  async logMeal(meal: LoggedMeal): Promise<void> {
    try {
      const key = `${DAILY_LOG_KEY}_${meal.date}`;
      const log = await this.getDailyLog(meal.date);
      log.push(meal);
      await AsyncStorage.setItem(key, JSON.stringify(log));
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  },

  async removeMealLog(date: string, timestamp: string): Promise<void> {
    try {
      const key = `${DAILY_LOG_KEY}_${date}`;
      const log = await this.getDailyLog(date);
      const updated = log.filter(meal => meal.timestamp !== timestamp);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing meal log:', error);
      throw error;
    }
  },

  async getGoals(): Promise<DailyGoals | null> {
    try {
      const data = await AsyncStorage.getItem(GOALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading goals:', error);
      return null;
    }
  },

  async saveGoals(goals: DailyGoals): Promise<void> {
    try {
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving goals:', error);
      throw error;
    }
  },

  async getCustomMeals(): Promise<CustomMeal[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOM_MEALS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading custom meals:', error);
      return [];
    }
  },

  async addCustomMeal(meal: CustomMeal): Promise<void> {
    try {
      const meals = await this.getCustomMeals();
      meals.push(meal);
      await AsyncStorage.setItem(CUSTOM_MEALS_KEY, JSON.stringify(meals));
    } catch (error) {
      console.error('Error adding custom meal:', error);
      throw error;
    }
  },

  async removeCustomMeal(mealId: string): Promise<void> {
    try {
      const meals = await this.getCustomMeals();
      const updated = meals.filter(m => m.id !== mealId);
      await AsyncStorage.setItem(CUSTOM_MEALS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing custom meal:', error);
      throw error;
    }
  },
};
