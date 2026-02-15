export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: string;
}

export interface MealEntry {
  id: string;
  timestamp: number;
  imageDataUrl?: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface UserProfile {
  sex: Sex;
  age: number;
  weight: number; // kg
  height: number; // cm
  activityLevel: ActivityLevel;
  goalCalories?: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
}

export type AIProvider = "openai" | "openrouter" | "custom";
export type KeySource = "local" | "server";

export interface AISettings {
  provider: AIProvider;
  model: string;
  keySource: KeySource;
  localApiKey: string;
  customApiUrl: string;
}
