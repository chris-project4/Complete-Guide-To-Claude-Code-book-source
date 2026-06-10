// Cross-the-wire types shared by BOTH server and client.
// This is the single source of truth for these shapes — never duplicate them.

// A food item. Macronutrients are in grams; calories are NEVER stored here —
// they are always derived from these macros (see ./calories).
export interface Food {
  name: string;
  carbs: number; // grams
  protein: number; // grams
  fat: number; // grams
}

// A logged meal: a named set of foods eaten at a given moment.
// Calories are derived by summing the calories of its foods.
export interface Meal {
  id: number;
  name: string;
  eatenAt: string; // local datetime "YYYY-MM-DDTHH:mm"; its date part groups the daily summary
  foods: Food[];
}

// The payload accepted when creating a meal (server assigns the id).
export type NewMeal = Omit<Meal, "id">;

// A meal as returned by the API, with its derived calorie total attached.
export interface MealView extends Meal {
  calories: number;
}

// One point in the daily calorie summary used by the Home chart.
export interface DailyCalories {
  date: string; // "YYYY-MM-DD"
  calories: number;
}

// Average macros + calories per day over a window (the Home weekly summary).
export interface MacroAverage {
  carbs: number; // grams/day
  protein: number; // grams/day
  fat: number; // grams/day
  calories: number; // kcal/day
}
