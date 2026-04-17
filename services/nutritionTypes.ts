export interface DiningHall {
  id: string;
  name: string;
  created_at?: string | null;
}

export interface Station {
  id: string;
  name: string;
  hall_id?: string | null;
  dining_hall_id?: string | null;
  created_at?: string | null;
  dining_hall?: DiningHall | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  station_id?: string | null;
  display_order?: number | null;
  created_at?: string | null;
  station?: Station | null;
}

export interface FoodItem {
  id: string;
  name: string;
  station_id: string;
  category_id?: string | null;
  calories?: number | null;
  serving_size: string;
  ingredients?: string[] | null;
  allergens: string[];
  traits: string[];
  dietary_flags: string[];
  nutrients: Record<string, unknown>;
  micronutrients?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  station?: {
    id: string;
    name: string;
  } | null;
  dining_hall?: {
    id: string;
    name: string;
  } | null;
}
