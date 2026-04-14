export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

export interface Meal {
  id: string;
  name: string;
  location: string;
  category: string;
  servingSize: string;
  nutrition: NutritionSummary;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
}
