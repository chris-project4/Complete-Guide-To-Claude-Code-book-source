import type { Food } from "./types.ts";

// The single calorie calculation, shared by server and client.
// No I/O: pure functions in, numbers out.

// kcal per gram of each macronutrient.
const KCAL_PER_GRAM = { carbs: 4, protein: 4, fat: 9 } as const;

// Calories for a single food, derived from its macros.
export function caloriesForFood(food: Food): number {
  return (
    food.carbs * KCAL_PER_GRAM.carbs +
    food.protein * KCAL_PER_GRAM.protein +
    food.fat * KCAL_PER_GRAM.fat
  );
}

// Calories for a meal: the sum of the calories of its foods.
// Accepts anything carrying a `foods` list (a persisted Meal, a NewMeal, etc.).
export function caloriesForMeal(meal: { foods: Food[] }): number {
  return meal.foods.reduce((total, food) => total + caloriesForFood(food), 0);
}
