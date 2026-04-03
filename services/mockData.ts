export interface NutritionInfo {
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
  category: string;
  location: string;
  nutrition: NutritionInfo;
  servingSize: string;
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isFavorite?: boolean;
}

export interface DiningLocation {
  id: string;
  name: string;
  shortName: string;
  description: string;
  hours: string;
  categories: string[];
  icon: string;
}

// ──────────────────────────────────────────────
// BSU DINING LOCATIONS
// ──────────────────────────────────────────────
export const diningLocations: DiningLocation[] = [
  {
    id: 'woodworth',
    name: 'Woodworth Dining & Riverside Emporium',
    shortName: 'Woodworth',
    description: 'Custom ramen, poke bowls, fresh sushi, brick-oven pizza, grill favorites & Italian entrées.',
    hours: 'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
    categories: ["Comfort Zone", "Woody's Grill", "Dellacasa", "Hissho Sushi", "Deli World", "Patisseries"],
    icon: 'restaurant',
  },
  {
    id: 'northdining',
    name: 'North Dining Complex',
    shortName: 'North Dining',
    description: 'Chick-fil-A, BBQ, bakery, homestyle cooking, Italian, Boar\'s Head Deli & allergen-free options.',
    hours: 'Mon–Thu 7am–9:30pm · Fri 7am–7:30pm · Sat–Sun 9:30am–9:30pm',
    categories: ['Homestyle', 'Chick-fil-A', 'BBQ', "Boar's Head Deli", 'Italian', 'Bakery', 'Allergen Free'],
    icon: 'fastfood',
  },
  {
    id: 'tally',
    name: 'Student Center Tally & Starbucks',
    shortName: 'The Tally',
    description: 'Taco Bell, stir fry, homestyle, grill, salad & soup bar, and a full Starbucks.',
    hours: 'Mon–Fri 7:30am–7:30pm · Sat–Sun 9:30am–4pm',
    categories: ['Taco Bell', 'Grill', 'Homestyle', 'Stir Fry', 'Salad & Soup Bar', 'Starbucks'],
    icon: 'local-cafe',
  },
  {
    id: 'atrium',
    name: 'The Atrium',
    shortName: 'Atrium',
    description: 'Located in the Art & Journalism Building with lunch and dinner options daily.',
    hours: 'Mon–Thu 11am–7:30pm · Fri 11am–4pm',
    categories: ['Entrées', 'Grill', 'Vegetarian', 'Sides', 'Desserts'],
    icon: 'store',
  },
  {
    id: 'noyer',
    name: 'Noyer Market',
    shortName: 'Noyer',
    description: 'Crispy Greens salads, Burgers-n-Spuds, Pasta & Panini, and Mom\'s comfort food.',
    hours: 'Mon–Fri 11am–8pm',
    categories: ["Burgers-n-Spuds", "Pasta & Panini", "Crispy Greens", "Mom's Comfort", "Grab & Go"],
    icon: 'shopping-bag',
  },
  {
    id: 'tomjohn',
    name: "Tom John Food Shop",
    shortName: 'Tom John',
    description: 'Located in Kinghorn Hall, serving breakfast through late night options.',
    hours: 'Mon–Thu 8:30am–midnight · Fri 8:30am–8:30pm · Sun 5pm–midnight',
    categories: ['Breakfast', 'Grill', 'Homestyle', 'Late Night', 'Snacks'],
    icon: 'nightlife',
  },
];

// ──────────────────────────────────────────────
// WOODWORTH DINING
// ──────────────────────────────────────────────
const woodworthMeals: Meal[] = [
  // Comfort Zone
  {
    id: 'w-cz-1', name: 'Mac and Cheese', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 cup', isVegetarian: true,
    nutrition: { calories: 410, protein: 16, carbs: 52, fat: 16, fiber: 2, sugar: 6, sodium: 820, cholesterol: 45 },
  },
  {
    id: 'w-cz-2', name: 'Roast Turkey with Gravy', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '4 oz turkey + 2 oz gravy',
    nutrition: { calories: 260, protein: 34, carbs: 8, fat: 9, fiber: 0, sugar: 1, sodium: 680, cholesterol: 90 },
  },
  {
    id: 'w-cz-3', name: 'Chicken and Noodles', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1.5 cups',
    nutrition: { calories: 380, protein: 28, carbs: 44, fat: 10, fiber: 2, sugar: 3, sodium: 920, cholesterol: 75 },
  },
  {
    id: 'w-cz-4', name: 'Green Beans with Butter', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1/2 cup', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 60, protein: 2, carbs: 7, fat: 3, fiber: 2, sugar: 2, sodium: 130, cholesterol: 8 },
  },
  {
    id: 'w-cz-5', name: 'Mashed Potatoes', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1/2 cup', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 140, protein: 3, carbs: 22, fat: 5, fiber: 2, sugar: 1, sodium: 310, cholesterol: 12 },
  },
  {
    id: 'w-cz-6', name: 'Beef Pot Roast', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '4 oz', isGlutenFree: true,
    nutrition: { calories: 310, protein: 36, carbs: 4, fat: 16, fiber: 0, sugar: 2, sodium: 560, cholesterol: 110 },
  },
  {
    id: 'w-cz-7', name: 'Vegetable Soup', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 cup', isVegetarian: true, isVegan: true,
    nutrition: { calories: 90, protein: 3, carbs: 18, fat: 1, fiber: 4, sugar: 6, sodium: 720, cholesterol: 0 },
  },
  {
    id: 'w-cz-8', name: 'Beef Lasagna', category: 'Comfort Zone', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 piece (8 oz)',
    nutrition: { calories: 520, protein: 30, carbs: 48, fat: 22, fiber: 3, sugar: 8, sodium: 1050, cholesterol: 95 },
  },

  // Woody's Grill
  {
    id: 'w-g-1', name: 'Classic Cheeseburger', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 burger',
    nutrition: { calories: 680, protein: 40, carbs: 46, fat: 36, fiber: 2, sugar: 9, sodium: 1020, cholesterol: 120 },
  },
  {
    id: 'w-g-2', name: 'Grilled Chicken Sandwich', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 sandwich',
    nutrition: { calories: 460, protein: 42, carbs: 38, fat: 14, fiber: 2, sugar: 6, sodium: 780, cholesterol: 100 },
  },
  {
    id: 'w-g-3', name: 'Chicken Tenders', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '3 pieces',
    nutrition: { calories: 390, protein: 32, carbs: 24, fat: 18, fiber: 1, sugar: 1, sodium: 860, cholesterol: 85 },
  },
  {
    id: 'w-g-4', name: 'Vegan Burger', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 burger', isVegan: true,
    nutrition: { calories: 420, protein: 22, carbs: 50, fat: 14, fiber: 6, sugar: 8, sodium: 620, cholesterol: 0 },
  },
  {
    id: 'w-g-5', name: 'Steak Fries', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: 'Regular', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 360, protein: 5, carbs: 50, fat: 16, fiber: 5, sugar: 0, sodium: 480, cholesterol: 0 },
  },
  {
    id: 'w-g-6', name: 'Grilled Cheese', category: "Woody's Grill", location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 sandwich', isVegetarian: true,
    nutrition: { calories: 480, protein: 18, carbs: 44, fat: 26, fiber: 2, sugar: 4, sodium: 740, cholesterol: 65 },
  },

  // Dellacasa (Italian)
  {
    id: 'w-d-1', name: 'Cheese Pizza', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '2 slices', isVegetarian: true,
    nutrition: { calories: 540, protein: 24, carbs: 70, fat: 18, fiber: 4, sugar: 9, sodium: 1140, cholesterol: 48 },
  },
  {
    id: 'w-d-2', name: 'Pepperoni Pizza', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '2 slices',
    nutrition: { calories: 620, protein: 28, carbs: 68, fat: 26, fiber: 3, sugar: 8, sodium: 1420, cholesterol: 65 },
  },
  {
    id: 'w-d-3', name: 'Veggie Pizza', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '2 slices', isVegetarian: true,
    nutrition: { calories: 490, protein: 20, carbs: 68, fat: 14, fiber: 5, sugar: 10, sodium: 980, cholesterol: 30 },
  },
  {
    id: 'w-d-4', name: 'Penne Arrabiata', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1.5 cups', isVegan: true,
    nutrition: { calories: 480, protein: 14, carbs: 82, fat: 10, fiber: 6, sugar: 12, sodium: 760, cholesterol: 0 },
  },
  {
    id: 'w-d-5', name: 'Chicken Parmesan', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 piece + sauce',
    nutrition: { calories: 620, protein: 46, carbs: 44, fat: 26, fiber: 3, sugar: 8, sodium: 1180, cholesterol: 130 },
  },
  {
    id: 'w-d-6', name: 'Fettuccine Alfredo', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1.5 cups', isVegetarian: true,
    nutrition: { calories: 660, protein: 20, carbs: 74, fat: 32, fiber: 3, sugar: 4, sodium: 820, cholesterol: 90 },
  },
  {
    id: 'w-d-7', name: 'Tuscan Roasted Vegetables', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 cup', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 120, protein: 3, carbs: 16, fat: 6, fiber: 4, sugar: 8, sodium: 280, cholesterol: 0 },
  },
  {
    id: 'w-d-8', name: 'Garlic Bread', category: 'Dellacasa', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '2 slices', isVegetarian: true,
    nutrition: { calories: 280, protein: 6, carbs: 36, fat: 12, fiber: 2, sugar: 2, sodium: 460, cholesterol: 20 },
  },

  // Hissho Sushi
  {
    id: 'w-s-1', name: 'California Roll', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '8 pieces', isGlutenFree: true,
    nutrition: { calories: 320, protein: 10, carbs: 54, fat: 8, fiber: 2, sugar: 6, sodium: 620, cholesterol: 20 },
  },
  {
    id: 'w-s-2', name: 'Spicy Tuna Roll', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '8 pieces', isGlutenFree: true,
    nutrition: { calories: 360, protein: 16, carbs: 50, fat: 10, fiber: 2, sugar: 4, sodium: 680, cholesterol: 30 },
  },
  {
    id: 'w-s-3', name: 'Veggie Roll', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '8 pieces', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 260, protein: 6, carbs: 52, fat: 4, fiber: 4, sugar: 6, sodium: 420, cholesterol: 0 },
  },
  {
    id: 'w-s-4', name: 'Chicken Teriyaki Poke Bowl', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bowl', isGlutenFree: true,
    nutrition: { calories: 580, protein: 38, carbs: 72, fat: 14, fiber: 4, sugar: 14, sodium: 1080, cholesterol: 85 },
  },
  {
    id: 'w-s-5', name: 'Salmon Poke Bowl', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bowl', isGlutenFree: true,
    nutrition: { calories: 620, protein: 34, carbs: 68, fat: 20, fiber: 4, sugar: 12, sodium: 960, cholesterol: 70 },
  },
  {
    id: 'w-s-6', name: 'Tonkotsu Ramen', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bowl',
    nutrition: { calories: 720, protein: 32, carbs: 82, fat: 28, fiber: 4, sugar: 6, sodium: 1680, cholesterol: 85 },
  },
  {
    id: 'w-s-7', name: 'Chicken Donburi', category: 'Hissho Sushi', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bowl',
    nutrition: { calories: 540, protein: 30, carbs: 74, fat: 12, fiber: 3, sugar: 8, sodium: 860, cholesterol: 70 },
  },

  // Deli World
  {
    id: 'w-dw-1', name: 'Custom Salad (House)', category: 'Deli World', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 large bowl', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 280, protein: 10, carbs: 24, fat: 16, fiber: 6, sugar: 8, sodium: 520, cholesterol: 20 },
  },
  {
    id: 'w-dw-2', name: 'Turkey Club Wrap', category: 'Deli World', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 wrap',
    nutrition: { calories: 520, protein: 34, carbs: 52, fat: 18, fiber: 4, sugar: 5, sodium: 1240, cholesterol: 70 },
  },
  {
    id: 'w-dw-3', name: 'Caprese Panini', category: 'Deli World', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 sandwich', isVegetarian: true,
    nutrition: { calories: 460, protein: 22, carbs: 48, fat: 20, fiber: 3, sugar: 6, sodium: 820, cholesterol: 45 },
  },
  {
    id: 'w-dw-4', name: 'Ham & Swiss on Sourdough', category: 'Deli World', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 sandwich',
    nutrition: { calories: 540, protein: 30, carbs: 56, fat: 20, fiber: 3, sugar: 5, sodium: 1380, cholesterol: 80 },
  },

  // Patisseries
  {
    id: 'w-p-1', name: 'Chocolate Chip Cookie', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 large cookie', isVegetarian: true,
    nutrition: { calories: 280, protein: 4, carbs: 38, fat: 13, fiber: 1, sugar: 22, sodium: 180, cholesterol: 30 },
  },
  {
    id: 'w-p-2', name: 'New York Cheesecake', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 slice', isVegetarian: true,
    nutrition: { calories: 420, protein: 8, carbs: 46, fat: 24, fiber: 0, sugar: 34, sodium: 290, cholesterol: 120 },
  },
  {
    id: 'w-p-3', name: 'Vegan Chocolate Cupcake', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 cupcake', isVegan: true,
    nutrition: { calories: 310, protein: 4, carbs: 48, fat: 12, fiber: 2, sugar: 28, sodium: 200, cholesterol: 0 },
  },
  {
    id: 'w-p-4', name: 'Gluten-Free Lemon Bar', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bar', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 220, protein: 4, carbs: 32, fat: 10, fiber: 0, sugar: 24, sodium: 140, cholesterol: 85 },
  },
  {
    id: 'w-p-5', name: 'Cookie Bar Assortment', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '1 bar', isVegetarian: true,
    nutrition: { calories: 340, protein: 4, carbs: 44, fat: 16, fiber: 1, sugar: 30, sodium: 210, cholesterol: 40 },
  },
  {
    id: 'w-p-6', name: 'Hubbard & Cravens Latte', category: 'Patisseries', location: 'Woodworth Dining & Riverside Emporium',
    servingSize: '12 oz', isVegetarian: true,
    nutrition: { calories: 180, protein: 8, carbs: 24, fat: 6, fiber: 0, sugar: 20, sodium: 90, cholesterol: 20 },
  },
];

// ──────────────────────────────────────────────
// NORTH DINING COMPLEX
// ──────────────────────────────────────────────
const northDiningMeals: Meal[] = [
  // Homestyle
  {
    id: 'nd-h-1', name: 'Biscuits and Gravy', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '2 biscuits + gravy',
    nutrition: { calories: 580, protein: 16, carbs: 62, fat: 30, fiber: 2, sugar: 4, sodium: 1240, cholesterol: 45 },
  },
  {
    id: 'nd-h-2', name: 'Scrambled Eggs', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '2 eggs', isGlutenFree: true, isVegetarian: true,
    nutrition: { calories: 160, protein: 12, carbs: 2, fat: 12, fiber: 0, sugar: 1, sodium: 240, cholesterol: 380 },
  },
  {
    id: 'nd-h-3', name: 'Buttermilk Pancakes', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '3 pancakes', isVegetarian: true,
    nutrition: { calories: 440, protein: 10, carbs: 72, fat: 12, fiber: 2, sugar: 18, sodium: 720, cholesterol: 45 },
  },
  {
    id: 'nd-h-4', name: 'Meatloaf with Mashed Potatoes', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '1 serving',
    nutrition: { calories: 560, protein: 32, carbs: 44, fat: 26, fiber: 3, sugar: 10, sodium: 980, cholesterol: 105 },
  },
  {
    id: 'nd-h-5', name: 'Chicken Parmesan', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '1 piece + pasta',
    nutrition: { calories: 680, protein: 48, carbs: 58, fat: 28, fiber: 4, sugar: 10, sodium: 1280, cholesterol: 140 },
  },
  {
    id: 'nd-h-6', name: 'Donut Bread Pudding', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '1 piece', isVegetarian: true,
    nutrition: { calories: 460, protein: 10, carbs: 66, fat: 18, fiber: 2, sugar: 38, sodium: 360, cholesterol: 110 },
  },
  {
    id: 'nd-h-7', name: 'Peach Cobbler', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '1 serving', isVegetarian: true,
    nutrition: { calories: 380, protein: 4, carbs: 62, fat: 14, fiber: 2, sugar: 40, sodium: 280, cholesterol: 30 },
  },
  {
    id: 'nd-h-8', name: 'Oatmeal', category: 'Homestyle', location: 'North Dining Complex',
    servingSize: '1 cup', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, sugar: 1, sodium: 105, cholesterol: 0 },
  },

  // Chick-fil-A
  {
    id: 'nd-cfa-1', name: 'Chick-fil-A Chicken Sandwich', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '1 sandwich',
    nutrition: { calories: 470, protein: 28, carbs: 41, fat: 21, fiber: 1, sugar: 5, sodium: 1350, cholesterol: 80 },
  },
  {
    id: 'nd-cfa-2', name: 'Spicy Deluxe Sandwich', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '1 sandwich',
    nutrition: { calories: 550, protein: 38, carbs: 44, fat: 27, fiber: 2, sugar: 8, sodium: 1760, cholesterol: 100 },
  },
  {
    id: 'nd-cfa-3', name: 'Chick-fil-A Nuggets', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '8 ct',
    nutrition: { calories: 260, protein: 26, carbs: 11, fat: 12, fiber: 0, sugar: 1, sodium: 1010, cholesterol: 80 },
  },
  {
    id: 'nd-cfa-4', name: 'Waffle Fries', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: 'Medium', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 420, protein: 5, carbs: 54, fat: 20, fiber: 5, sugar: 0, sodium: 270, cholesterol: 0 },
  },
  {
    id: 'nd-cfa-5', name: 'Grilled Chicken Club', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '1 sandwich',
    nutrition: { calories: 500, protein: 43, carbs: 38, fat: 19, fiber: 2, sugar: 10, sodium: 1390, cholesterol: 135 },
  },
  {
    id: 'nd-cfa-6', name: 'Grilled Nuggets', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '8 ct', isGlutenFree: true,
    nutrition: { calories: 140, protein: 25, carbs: 2, fat: 3, fiber: 0, sugar: 1, sodium: 540, cholesterol: 75 },
  },
  {
    id: 'nd-cfa-7', name: 'Chick-n-Strips', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '3 strips',
    nutrition: { calories: 400, protein: 38, carbs: 21, fat: 18, fiber: 1, sugar: 1, sodium: 1270, cholesterol: 90 },
  },
  {
    id: 'nd-cfa-8', name: 'Frosted Lemonade', category: 'Chick-fil-A', location: 'North Dining Complex',
    servingSize: '16 oz', isVegetarian: true,
    nutrition: { calories: 330, protein: 6, carbs: 60, fat: 8, fiber: 0, sugar: 58, sodium: 160, cholesterol: 35 },
  },

  // BBQ
  {
    id: 'nd-bbq-1', name: 'BBQ Pulled Pork Sandwich', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '1 sandwich',
    nutrition: { calories: 580, protein: 36, carbs: 56, fat: 22, fiber: 3, sugar: 16, sodium: 1260, cholesterol: 95 },
  },
  {
    id: 'nd-bbq-2', name: 'Smoked Brisket', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '4 oz', isGlutenFree: true,
    nutrition: { calories: 320, protein: 38, carbs: 0, fat: 18, fiber: 0, sugar: 0, sodium: 680, cholesterol: 115 },
  },
  {
    id: 'nd-bbq-3', name: 'BBQ Chicken Breast', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '5 oz', isGlutenFree: true,
    nutrition: { calories: 290, protein: 44, carbs: 8, fat: 8, fiber: 0, sugar: 6, sodium: 560, cholesterol: 120 },
  },
  {
    id: 'nd-bbq-4', name: 'Coleslaw', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '1/2 cup', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 140, protein: 1, carbs: 18, fat: 7, fiber: 2, sugar: 14, sodium: 220, cholesterol: 10 },
  },
  {
    id: 'nd-bbq-5', name: 'Baked Beans', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '1/2 cup',
    nutrition: { calories: 180, protein: 8, carbs: 32, fat: 3, fiber: 6, sugar: 12, sodium: 480, cholesterol: 10 },
  },
  {
    id: 'nd-bbq-6', name: 'Corn on the Cob', category: 'BBQ', location: 'North Dining Complex',
    servingSize: '1 ear', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 120, protein: 4, carbs: 24, fat: 2, fiber: 3, sugar: 8, sodium: 15, cholesterol: 0 },
  },

  // Boar's Head Deli
  {
    id: 'nd-bd-1', name: 'Boar\'s Head Turkey Breast Sub', category: "Boar's Head Deli", location: 'North Dining Complex',
    servingSize: '6 inch',
    nutrition: { calories: 440, protein: 34, carbs: 48, fat: 12, fiber: 3, sugar: 5, sodium: 1280, cholesterol: 65 },
  },
  {
    id: 'nd-bd-2', name: 'Boar\'s Head Ham & Swiss', category: "Boar's Head Deli", location: 'North Dining Complex',
    servingSize: '6 inch',
    nutrition: { calories: 490, protein: 32, carbs: 46, fat: 18, fiber: 2, sugar: 6, sodium: 1440, cholesterol: 85 },
  },
  {
    id: 'nd-bd-3', name: 'Boar\'s Head Roast Beef', category: "Boar's Head Deli", location: 'North Dining Complex',
    servingSize: '6 inch',
    nutrition: { calories: 520, protein: 40, carbs: 48, fat: 16, fiber: 2, sugar: 5, sodium: 1360, cholesterol: 95 },
  },
  {
    id: 'nd-bd-4', name: 'Veggie Sub', category: "Boar's Head Deli", location: 'North Dining Complex',
    servingSize: '6 inch', isVegetarian: true,
    nutrition: { calories: 380, protein: 16, carbs: 52, fat: 12, fiber: 5, sugar: 8, sodium: 780, cholesterol: 25 },
  },

  // Italian
  {
    id: 'nd-i-1', name: 'Penne Marinara', category: 'Italian', location: 'North Dining Complex',
    servingSize: '1.5 cups', isVegan: true,
    nutrition: { calories: 400, protein: 14, carbs: 74, fat: 6, fiber: 5, sugar: 10, sodium: 680, cholesterol: 0 },
  },
  {
    id: 'nd-i-2', name: 'Meat Lasagna', category: 'Italian', location: 'North Dining Complex',
    servingSize: '1 piece',
    nutrition: { calories: 560, protein: 34, carbs: 48, fat: 24, fiber: 3, sugar: 8, sodium: 1080, cholesterol: 100 },
  },
  {
    id: 'nd-i-3', name: 'Eggplant Parmesan', category: 'Italian', location: 'North Dining Complex',
    servingSize: '1 piece', isVegetarian: true,
    nutrition: { calories: 480, protein: 18, carbs: 52, fat: 22, fiber: 5, sugar: 12, sodium: 920, cholesterol: 55 },
  },
  {
    id: 'nd-i-4', name: 'Caesar Salad', category: 'Italian', location: 'North Dining Complex',
    servingSize: '1 large bowl', isVegetarian: true,
    nutrition: { calories: 340, protein: 14, carbs: 24, fat: 22, fiber: 4, sugar: 3, sodium: 720, cholesterol: 40 },
  },

  // Bakery
  {
    id: 'nd-bk-1', name: 'Blueberry Muffin', category: 'Bakery', location: 'North Dining Complex',
    servingSize: '1 muffin', isVegetarian: true,
    nutrition: { calories: 380, protein: 6, carbs: 56, fat: 16, fiber: 2, sugar: 30, sodium: 340, cholesterol: 60 },
  },
  {
    id: 'nd-bk-2', name: 'Bagel with Cream Cheese', category: 'Bakery', location: 'North Dining Complex',
    servingSize: '1 bagel + 2 tbsp', isVegetarian: true,
    nutrition: { calories: 360, protein: 12, carbs: 52, fat: 12, fiber: 2, sugar: 6, sodium: 680, cholesterol: 35 },
  },
  {
    id: 'nd-bk-3', name: 'Cinnamon Roll', category: 'Bakery', location: 'North Dining Complex',
    servingSize: '1 roll', isVegetarian: true,
    nutrition: { calories: 520, protein: 8, carbs: 76, fat: 20, fiber: 2, sugar: 38, sodium: 420, cholesterol: 45 },
  },
  {
    id: 'nd-bk-4', name: 'Banana Bread', category: 'Bakery', location: 'North Dining Complex',
    servingSize: '1 slice', isVegetarian: true,
    nutrition: { calories: 290, protein: 4, carbs: 46, fat: 10, fiber: 2, sugar: 26, sodium: 280, cholesterol: 40 },
  },

  // Allergen Free
  {
    id: 'nd-af-1', name: 'GF Pasta with Marinara', category: 'Allergen Free', location: 'North Dining Complex',
    servingSize: '1.5 cups', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 380, protein: 8, carbs: 76, fat: 4, fiber: 4, sugar: 10, sodium: 520, cholesterol: 0 },
  },
  {
    id: 'nd-af-2', name: 'Allergen-Free Grilled Chicken', category: 'Allergen Free', location: 'North Dining Complex',
    servingSize: '5 oz', isGlutenFree: true,
    nutrition: { calories: 220, protein: 42, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 360, cholesterol: 110 },
  },
  {
    id: 'nd-af-3', name: 'Steamed Rice', category: 'Allergen Free', location: 'North Dining Complex',
    servingSize: '1 cup', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 200, protein: 4, carbs: 44, fat: 0, fiber: 1, sugar: 0, sodium: 0, cholesterol: 0 },
  },
  {
    id: 'nd-af-4', name: 'Fresh Fruit Cup', category: 'Allergen Free', location: 'North Dining Complex',
    servingSize: '1 cup', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 80, protein: 1, carbs: 20, fat: 0, fiber: 3, sugar: 16, sodium: 5, cholesterol: 0 },
  },
];

// ──────────────────────────────────────────────
// THE TALLY (Student Center)
// ──────────────────────────────────────────────
const tallyMeals: Meal[] = [
  // Taco Bell
  {
    id: 'tl-tb-1', name: 'Crunchy Taco', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 taco', isGlutenFree: true,
    nutrition: { calories: 170, protein: 8, carbs: 13, fat: 9, fiber: 3, sugar: 1, sodium: 310, cholesterol: 25 },
  },
  {
    id: 'tl-tb-2', name: 'Burrito Supreme', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 burrito',
    nutrition: { calories: 430, protein: 18, carbs: 52, fat: 17, fiber: 7, sugar: 5, sodium: 1100, cholesterol: 45 },
  },
  {
    id: 'tl-tb-3', name: 'Quesadilla', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 quesadilla', isVegetarian: true,
    nutrition: { calories: 510, protein: 25, carbs: 40, fat: 27, fiber: 3, sugar: 4, sodium: 1120, cholesterol: 75 },
  },
  {
    id: 'tl-tb-4', name: 'Chalupa Supreme', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 chalupa',
    nutrition: { calories: 360, protein: 14, carbs: 33, fat: 20, fiber: 4, sugar: 4, sodium: 590, cholesterol: 35 },
  },
  {
    id: 'tl-tb-5', name: 'Doritos Locos Taco', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 taco',
    nutrition: { calories: 180, protein: 8, carbs: 15, fat: 9, fiber: 3, sugar: 1, sodium: 360, cholesterol: 25 },
  },
  {
    id: 'tl-tb-6', name: 'Mexican Pizza', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 pizza',
    nutrition: { calories: 540, protein: 20, carbs: 49, fat: 30, fiber: 6, sugar: 3, sodium: 1000, cholesterol: 55 },
  },
  {
    id: 'tl-tb-7', name: 'Bean Burrito', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '1 burrito', isVegetarian: true,
    nutrition: { calories: 350, protein: 13, carbs: 55, fat: 9, fiber: 9, sugar: 4, sodium: 1020, cholesterol: 10 },
  },
  {
    id: 'tl-tb-8', name: 'Cinnabon Delights', category: 'Taco Bell', location: 'Student Center Tally & Starbucks',
    servingSize: '2 ct', isVegetarian: true,
    nutrition: { calories: 160, protein: 2, carbs: 24, fat: 7, fiber: 0, sugar: 12, sodium: 125, cholesterol: 10 },
  },

  // Grill
  {
    id: 'tl-gr-1', name: 'Classic Cheeseburger', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: '1 burger',
    nutrition: { calories: 660, protein: 38, carbs: 44, fat: 36, fiber: 2, sugar: 8, sodium: 1060, cholesterol: 120 },
  },
  {
    id: 'tl-gr-2', name: 'Crispy Chicken Tenders', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: '3 pieces',
    nutrition: { calories: 410, protein: 30, carbs: 28, fat: 20, fiber: 1, sugar: 1, sodium: 920, cholesterol: 90 },
  },
  {
    id: 'tl-gr-3', name: 'Black Bean Burger', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: '1 burger', isVegan: true,
    nutrition: { calories: 400, protein: 18, carbs: 52, fat: 12, fiber: 8, sugar: 6, sodium: 680, cholesterol: 0 },
  },
  {
    id: 'tl-gr-4', name: 'Grilled Cheese', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: '1 sandwich', isVegetarian: true,
    nutrition: { calories: 460, protein: 16, carbs: 44, fat: 24, fiber: 2, sugar: 4, sodium: 780, cholesterol: 60 },
  },
  {
    id: 'tl-gr-5', name: 'Seasoned Fries', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: 'Regular', isVegan: true,
    nutrition: { calories: 380, protein: 5, carbs: 50, fat: 18, fiber: 4, sugar: 0, sodium: 560, cholesterol: 0 },
  },
  {
    id: 'tl-gr-6', name: 'Grilled Chicken Sandwich', category: 'Grill', location: 'Student Center Tally & Starbucks',
    servingSize: '1 sandwich',
    nutrition: { calories: 450, protein: 40, carbs: 36, fat: 14, fiber: 2, sugar: 5, sodium: 800, cholesterol: 105 },
  },

  // Homestyle
  {
    id: 'tl-hm-1', name: 'Breakfast Eggs & Sausage', category: 'Homestyle', location: 'Student Center Tally & Starbucks',
    servingSize: '2 eggs + 2 links', isGlutenFree: true,
    nutrition: { calories: 340, protein: 24, carbs: 2, fat: 26, fiber: 0, sugar: 1, sodium: 720, cholesterol: 430 },
  },
  {
    id: 'tl-hm-2', name: 'Country Fried Steak', category: 'Homestyle', location: 'Student Center Tally & Starbucks',
    servingSize: '1 serving',
    nutrition: { calories: 620, protein: 30, carbs: 48, fat: 34, fiber: 2, sugar: 4, sodium: 1180, cholesterol: 110 },
  },
  {
    id: 'tl-hm-3', name: 'Veggie Stir Fry & Rice', category: 'Homestyle', location: 'Student Center Tally & Starbucks',
    servingSize: '1 bowl', isVegan: true,
    nutrition: { calories: 360, protein: 8, carbs: 68, fat: 8, fiber: 6, sugar: 10, sodium: 720, cholesterol: 0 },
  },
  {
    id: 'tl-hm-4', name: 'Soup of the Day', category: 'Homestyle', location: 'Student Center Tally & Starbucks',
    servingSize: '1 cup',
    nutrition: { calories: 150, protein: 8, carbs: 18, fat: 5, fiber: 3, sugar: 4, sodium: 780, cholesterol: 20 },
  },

  // Stir Fry
  {
    id: 'tl-sf-1', name: 'Chicken Stir Fry', category: 'Stir Fry', location: 'Student Center Tally & Starbucks',
    servingSize: '1 bowl', isGlutenFree: true,
    nutrition: { calories: 520, protein: 40, carbs: 58, fat: 14, fiber: 5, sugar: 10, sodium: 1100, cholesterol: 90 },
  },
  {
    id: 'tl-sf-2', name: 'Shrimp Stir Fry', category: 'Stir Fry', location: 'Student Center Tally & Starbucks',
    servingSize: '1 bowl', isGlutenFree: true,
    nutrition: { calories: 440, protein: 30, carbs: 56, fat: 10, fiber: 4, sugar: 8, sodium: 1040, cholesterol: 180 },
  },
  {
    id: 'tl-sf-3', name: 'Tofu Stir Fry', category: 'Stir Fry', location: 'Student Center Tally & Starbucks',
    servingSize: '1 bowl', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 380, protein: 18, carbs: 52, fat: 12, fiber: 5, sugar: 8, sodium: 860, cholesterol: 0 },
  },
  {
    id: 'tl-sf-4', name: 'Beef Stir Fry', category: 'Stir Fry', location: 'Student Center Tally & Starbucks',
    servingSize: '1 bowl',
    nutrition: { calories: 580, protein: 36, carbs: 58, fat: 22, fiber: 4, sugar: 8, sodium: 1280, cholesterol: 80 },
  },

  // Salad & Soup Bar
  {
    id: 'tl-ss-1', name: 'Garden Salad (Small)', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '8 oz', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 60, protein: 3, carbs: 10, fat: 1, fiber: 3, sugar: 5, sodium: 60, cholesterol: 0 },
  },
  {
    id: 'tl-ss-2', name: 'Garden Salad (Large)', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '16 oz', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 120, protein: 6, carbs: 20, fat: 2, fiber: 6, sugar: 10, sodium: 120, cholesterol: 0 },
  },
  {
    id: 'tl-ss-3', name: 'Tomato Bisque Soup', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '1 cup', isVegetarian: true,
    nutrition: { calories: 180, protein: 4, carbs: 22, fat: 9, fiber: 2, sugar: 10, sodium: 840, cholesterol: 20 },
  },
  {
    id: 'tl-ss-4', name: 'Chicken Noodle Soup', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '1 cup',
    nutrition: { calories: 130, protein: 10, carbs: 18, fat: 3, fiber: 1, sugar: 3, sodium: 890, cholesterol: 30 },
  },
  {
    id: 'tl-ss-5', name: 'Greek Yogurt Parfait', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '1 cup', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 250, protein: 18, carbs: 34, fat: 5, fiber: 2, sugar: 26, sodium: 90, cholesterol: 15 },
  },
  {
    id: 'tl-ss-6', name: 'Chicken Salad', category: 'Salad & Soup Bar', location: 'Student Center Tally & Starbucks',
    servingSize: '4 oz', isGlutenFree: true,
    nutrition: { calories: 220, protein: 18, carbs: 6, fat: 14, fiber: 0, sugar: 3, sodium: 480, cholesterol: 55 },
  },

  // Starbucks
  {
    id: 'tl-sb-1', name: 'Caramel Macchiato', category: 'Starbucks', location: 'Student Center Tally & Starbucks',
    servingSize: '16 oz', isVegetarian: true,
    nutrition: { calories: 250, protein: 10, carbs: 34, fat: 7, fiber: 0, sugar: 32, sodium: 150, cholesterol: 25 },
  },
  {
    id: 'tl-sb-2', name: 'Cold Brew Coffee', category: 'Starbucks', location: 'Student Center Tally & Starbucks',
    servingSize: '16 oz', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 5, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 15, cholesterol: 0 },
  },
  {
    id: 'tl-sb-3', name: 'Vanilla Latte', category: 'Starbucks', location: 'Student Center Tally & Starbucks',
    servingSize: '16 oz', isVegetarian: true,
    nutrition: { calories: 280, protein: 12, carbs: 38, fat: 7, fiber: 0, sugar: 35, sodium: 170, cholesterol: 25 },
  },
  {
    id: 'tl-sb-4', name: 'Blueberry Scone', category: 'Starbucks', location: 'Student Center Tally & Starbucks',
    servingSize: '1 scone', isVegetarian: true,
    nutrition: { calories: 460, protein: 8, carbs: 68, fat: 18, fiber: 2, sugar: 28, sodium: 420, cholesterol: 55 },
  },
  {
    id: 'tl-sb-5', name: 'Protein Box', category: 'Starbucks', location: 'Student Center Tally & Starbucks',
    servingSize: '1 box',
    nutrition: { calories: 470, protein: 25, carbs: 44, fat: 20, fiber: 5, sugar: 14, sodium: 720, cholesterol: 380 },
  },
];

// ──────────────────────────────────────────────
// THE ATRIUM
// ──────────────────────────────────────────────
const atriumMeals: Meal[] = [
  {
    id: 'at-e-1', name: 'Roasted Salmon', category: 'Entrées', location: 'The Atrium',
    servingSize: '5 oz', isGlutenFree: true,
    nutrition: { calories: 310, protein: 42, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 340, cholesterol: 105 },
  },
  {
    id: 'at-e-2', name: 'Herb Chicken Breast', category: 'Entrées', location: 'The Atrium',
    servingSize: '5 oz', isGlutenFree: true,
    nutrition: { calories: 260, protein: 48, carbs: 2, fat: 6, fiber: 0, sugar: 0, sodium: 380, cholesterol: 130 },
  },
  {
    id: 'at-e-3', name: 'Beef Stroganoff', category: 'Entrées', location: 'The Atrium',
    servingSize: '1 cup',
    nutrition: { calories: 540, protein: 34, carbs: 46, fat: 24, fiber: 2, sugar: 4, sodium: 880, cholesterol: 110 },
  },
  {
    id: 'at-e-4', name: 'Stuffed Bell Pepper', category: 'Entrées', location: 'The Atrium',
    servingSize: '1 pepper', isGlutenFree: true,
    nutrition: { calories: 380, protein: 24, carbs: 36, fat: 14, fiber: 6, sugar: 10, sodium: 760, cholesterol: 55 },
  },
  {
    id: 'at-g-1', name: 'Burger with Fries', category: 'Grill', location: 'The Atrium',
    servingSize: '1 meal',
    nutrition: { calories: 980, protein: 42, carbs: 94, fat: 50, fiber: 7, sugar: 8, sodium: 1480, cholesterol: 120 },
  },
  {
    id: 'at-g-2', name: 'Grilled Chicken Caesar Wrap', category: 'Grill', location: 'The Atrium',
    servingSize: '1 wrap',
    nutrition: { calories: 520, protein: 38, carbs: 46, fat: 20, fiber: 3, sugar: 4, sodium: 940, cholesterol: 90 },
  },
  {
    id: 'at-v-1', name: 'Lentil Curry', category: 'Vegetarian', location: 'The Atrium',
    servingSize: '1.5 cups', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 320, protein: 16, carbs: 52, fat: 6, fiber: 14, sugar: 8, sodium: 640, cholesterol: 0 },
  },
  {
    id: 'at-v-2', name: 'Quinoa Buddha Bowl', category: 'Vegetarian', location: 'The Atrium',
    servingSize: '1 bowl', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 420, protein: 14, carbs: 64, fat: 14, fiber: 10, sugar: 12, sodium: 460, cholesterol: 0 },
  },
  {
    id: 'at-v-3', name: 'Veggie Hummus Plate', category: 'Vegetarian', location: 'The Atrium',
    servingSize: '1 plate', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 260, protein: 8, carbs: 32, fat: 12, fiber: 8, sugar: 6, sodium: 480, cholesterol: 0 },
  },
  {
    id: 'at-s-1', name: 'Dinner Roll', category: 'Sides', location: 'The Atrium',
    servingSize: '1 roll', isVegetarian: true,
    nutrition: { calories: 140, protein: 4, carbs: 24, fat: 3, fiber: 1, sugar: 2, sodium: 240, cholesterol: 5 },
  },
  {
    id: 'at-s-2', name: 'Roasted Broccoli', category: 'Sides', location: 'The Atrium',
    servingSize: '1/2 cup', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 55, protein: 3, carbs: 8, fat: 2, fiber: 3, sugar: 2, sodium: 100, cholesterol: 0 },
  },
  {
    id: 'at-s-3', name: 'Sweet Potato', category: 'Sides', location: 'The Atrium',
    servingSize: '1 medium', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 130, protein: 3, carbs: 30, fat: 0, fiber: 4, sugar: 10, sodium: 65, cholesterol: 0 },
  },
  {
    id: 'at-d-1', name: 'Chocolate Brownie', category: 'Desserts', location: 'The Atrium',
    servingSize: '1 piece', isVegetarian: true,
    nutrition: { calories: 310, protein: 4, carbs: 44, fat: 14, fiber: 2, sugar: 32, sodium: 180, cholesterol: 55 },
  },
  {
    id: 'at-d-2', name: 'Seasonal Fruit Crisp', category: 'Desserts', location: 'The Atrium',
    servingSize: '1 serving', isVegetarian: true,
    nutrition: { calories: 260, protein: 3, carbs: 48, fat: 8, fiber: 3, sugar: 30, sodium: 120, cholesterol: 15 },
  },
];

// ──────────────────────────────────────────────
// NOYER MARKET
// ──────────────────────────────────────────────
const noyerMeals: Meal[] = [
  {
    id: 'ny-bsp-1', name: 'Classic Smash Burger', category: "Burgers-n-Spuds", location: 'Noyer Market',
    servingSize: '1 burger',
    nutrition: { calories: 720, protein: 40, carbs: 52, fat: 38, fiber: 2, sugar: 8, sodium: 1080, cholesterol: 130 },
  },
  {
    id: 'ny-bsp-2', name: 'Loaded Baked Potato', category: "Burgers-n-Spuds", location: 'Noyer Market',
    servingSize: '1 potato', isVegetarian: true, isGlutenFree: true,
    nutrition: { calories: 580, protein: 20, carbs: 72, fat: 26, fiber: 7, sugar: 6, sodium: 680, cholesterol: 55 },
  },
  {
    id: 'ny-bsp-3', name: 'Turkey Burger', category: "Burgers-n-Spuds", location: 'Noyer Market',
    servingSize: '1 burger',
    nutrition: { calories: 560, protein: 38, carbs: 46, fat: 24, fiber: 2, sugar: 6, sodium: 920, cholesterol: 100 },
  },
  {
    id: 'ny-pp-1', name: 'Spaghetti Bolognese', category: "Pasta & Panini", location: 'Noyer Market',
    servingSize: '1.5 cups',
    nutrition: { calories: 580, protein: 30, carbs: 72, fat: 18, fiber: 5, sugar: 10, sodium: 920, cholesterol: 65 },
  },
  {
    id: 'ny-pp-2', name: 'Grilled Veggie Panini', category: "Pasta & Panini", location: 'Noyer Market',
    servingSize: '1 sandwich', isVegetarian: true,
    nutrition: { calories: 420, protein: 16, carbs: 52, fat: 16, fiber: 4, sugar: 6, sodium: 720, cholesterol: 20 },
  },
  {
    id: 'ny-pp-3', name: 'Chicken Pesto Panini', category: "Pasta & Panini", location: 'Noyer Market',
    servingSize: '1 sandwich',
    nutrition: { calories: 560, protein: 38, carbs: 48, fat: 22, fiber: 3, sugar: 4, sodium: 1020, cholesterol: 95 },
  },
  {
    id: 'ny-cg-1', name: 'Spinach Power Salad', category: "Crispy Greens", location: 'Noyer Market',
    servingSize: '1 large', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 180, protein: 6, carbs: 14, fat: 12, fiber: 5, sugar: 6, sodium: 280, cholesterol: 0 },
  },
  {
    id: 'ny-cg-2', name: 'Cobb Salad', category: "Crispy Greens", location: 'Noyer Market',
    servingSize: '1 large', isGlutenFree: true,
    nutrition: { calories: 440, protein: 30, carbs: 10, fat: 32, fiber: 4, sugar: 4, sodium: 820, cholesterol: 230 },
  },
  {
    id: 'ny-mc-1', name: 'Chicken and Dumplings', category: "Mom's Comfort", location: 'Noyer Market',
    servingSize: '1.5 cups',
    nutrition: { calories: 450, protein: 30, carbs: 52, fat: 12, fiber: 3, sugar: 4, sodium: 1020, cholesterol: 80 },
  },
  {
    id: 'ny-mc-2', name: 'Pot Roast & Vegetables', category: "Mom's Comfort", location: 'Noyer Market',
    servingSize: '1 serving', isGlutenFree: true,
    nutrition: { calories: 420, protein: 38, carbs: 28, fat: 18, fiber: 4, sugar: 8, sodium: 880, cholesterol: 110 },
  },
  {
    id: 'ny-go-1', name: 'Grab & Go Turkey Wrap', category: "Grab & Go", location: 'Noyer Market',
    servingSize: '1 wrap',
    nutrition: { calories: 460, protein: 30, carbs: 52, fat: 14, fiber: 3, sugar: 6, sodium: 1100, cholesterol: 60 },
  },
  {
    id: 'ny-go-2', name: 'Cheese & Crackers Snack Box', category: "Grab & Go", location: 'Noyer Market',
    servingSize: '1 box', isVegetarian: true,
    nutrition: { calories: 320, protein: 12, carbs: 30, fat: 18, fiber: 1, sugar: 4, sodium: 560, cholesterol: 40 },
  },
  {
    id: 'ny-go-3', name: 'Overnight Oats', category: "Grab & Go", location: 'Noyer Market',
    servingSize: '1 cup', isVegan: true,
    nutrition: { calories: 280, protein: 8, carbs: 46, fat: 7, fiber: 5, sugar: 16, sodium: 120, cholesterol: 0 },
  },
];

// ──────────────────────────────────────────────
// TOM JOHN FOOD SHOP
// ──────────────────────────────────────────────
const tomJohnMeals: Meal[] = [
  {
    id: 'tj-br-1', name: 'Breakfast Burrito', category: 'Breakfast', location: 'Tom John Food Shop',
    servingSize: '1 burrito',
    nutrition: { calories: 540, protein: 28, carbs: 54, fat: 24, fiber: 4, sugar: 4, sodium: 1080, cholesterol: 320 },
  },
  {
    id: 'tj-br-2', name: 'Yogurt & Granola', category: 'Breakfast', location: 'Tom John Food Shop',
    servingSize: '1 cup', isVegetarian: true,
    nutrition: { calories: 290, protein: 12, carbs: 48, fat: 7, fiber: 3, sugar: 24, sodium: 100, cholesterol: 10 },
  },
  {
    id: 'tj-br-3', name: 'Avocado Toast', category: 'Breakfast', location: 'Tom John Food Shop',
    servingSize: '2 slices', isVegan: true,
    nutrition: { calories: 340, protein: 8, carbs: 36, fat: 20, fiber: 8, sugar: 2, sodium: 480, cholesterol: 0 },
  },
  {
    id: 'tj-g-1', name: 'Double Smash Burger', category: 'Grill', location: 'Tom John Food Shop',
    servingSize: '1 burger',
    nutrition: { calories: 820, protein: 52, carbs: 46, fat: 46, fiber: 2, sugar: 8, sodium: 1280, cholesterol: 165 },
  },
  {
    id: 'tj-g-2', name: 'Hot Dog', category: 'Grill', location: 'Tom John Food Shop',
    servingSize: '1 hot dog',
    nutrition: { calories: 300, protein: 12, carbs: 24, fat: 18, fiber: 1, sugar: 4, sodium: 760, cholesterol: 45 },
  },
  {
    id: 'tj-g-3', name: 'Buffalo Wings', category: 'Grill', location: 'Tom John Food Shop',
    servingSize: '6 wings', isGlutenFree: true,
    nutrition: { calories: 560, protein: 44, carbs: 4, fat: 40, fiber: 0, sugar: 2, sodium: 1480, cholesterol: 190 },
  },
  {
    id: 'tj-hm-1', name: 'Mac and Cheese', category: 'Homestyle', location: 'Tom John Food Shop',
    servingSize: '1 cup', isVegetarian: true,
    nutrition: { calories: 420, protein: 16, carbs: 54, fat: 16, fiber: 2, sugar: 6, sodium: 840, cholesterol: 45 },
  },
  {
    id: 'tj-hm-2', name: 'Chili', category: 'Homestyle', location: 'Tom John Food Shop',
    servingSize: '1 cup',
    nutrition: { calories: 280, protein: 20, carbs: 30, fat: 8, fiber: 8, sugar: 6, sodium: 860, cholesterol: 40 },
  },
  {
    id: 'tj-hm-3', name: 'Grilled Salmon with Rice', category: 'Homestyle', location: 'Tom John Food Shop',
    servingSize: '1 plate', isGlutenFree: true,
    nutrition: { calories: 520, protein: 46, carbs: 46, fat: 16, fiber: 2, sugar: 2, sodium: 520, cholesterol: 110 },
  },
  {
    id: 'tj-ln-1', name: 'Mozzarella Sticks', category: 'Late Night', location: 'Tom John Food Shop',
    servingSize: '5 pieces', isVegetarian: true,
    nutrition: { calories: 480, protein: 22, carbs: 44, fat: 24, fiber: 2, sugar: 4, sodium: 1040, cholesterol: 55 },
  },
  {
    id: 'tj-ln-2', name: 'Loaded Nachos', category: 'Late Night', location: 'Tom John Food Shop',
    servingSize: '1 plate', isVegetarian: true,
    nutrition: { calories: 780, protein: 28, carbs: 72, fat: 44, fiber: 8, sugar: 6, sodium: 1560, cholesterol: 75 },
  },
  {
    id: 'tj-ln-3', name: 'Pepperoni Pizza Slice', category: 'Late Night', location: 'Tom John Food Shop',
    servingSize: '2 slices',
    nutrition: { calories: 580, protein: 26, carbs: 64, fat: 24, fiber: 3, sugar: 6, sodium: 1380, cholesterol: 60 },
  },
  {
    id: 'tj-sn-1', name: 'Bag of Chips', category: 'Snacks', location: 'Tom John Food Shop',
    servingSize: '1 bag (1 oz)', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 150, protein: 2, carbs: 16, fat: 8, fiber: 1, sugar: 0, sodium: 180, cholesterol: 0 },
  },
  {
    id: 'tj-sn-2', name: 'Cookie (Single)', category: 'Snacks', location: 'Tom John Food Shop',
    servingSize: '1 cookie', isVegetarian: true,
    nutrition: { calories: 260, protein: 3, carbs: 36, fat: 12, fiber: 1, sugar: 22, sodium: 170, cholesterol: 30 },
  },
  {
    id: 'tj-sn-3', name: 'Protein Bar', category: 'Snacks', location: 'Tom John Food Shop',
    servingSize: '1 bar', isGlutenFree: true,
    nutrition: { calories: 200, protein: 20, carbs: 22, fat: 7, fiber: 3, sugar: 6, sodium: 200, cholesterol: 5 },
  },
  {
    id: 'tj-sn-4', name: 'Fresh Apple', category: 'Snacks', location: 'Tom John Food Shop',
    servingSize: '1 medium', isVegan: true, isGlutenFree: true,
    nutrition: { calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4, sugar: 19, sodium: 2, cholesterol: 0 },
  },
];

// ──────────────────────────────────────────────
// COMBINED DATA
// ──────────────────────────────────────────────
export const mockMeals: Meal[] = [
  ...woodworthMeals,
  ...northDiningMeals,
  ...tallyMeals,
  ...atriumMeals,
  ...noyerMeals,
  ...tomJohnMeals,
];

export function getMealsByLocation(locationId: string): Meal[] {
  const location = diningLocations.find(loc => loc.id === locationId);
  if (!location) return [];
  return mockMeals.filter(meal => meal.location === location.name);
}

export function getMealsByCategory(locationId: string, category: string): Meal[] {
  const locationMeals = getMealsByLocation(locationId);
  return locationMeals.filter(meal => meal.category === category);
}

export function getAllMeals(): Meal[] {
  return mockMeals;
}
