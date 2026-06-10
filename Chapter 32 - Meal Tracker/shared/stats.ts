import type { Food, MacroAverage } from "./types.ts";
import { caloriesForFood } from "./calories.ts";

// Pure stats shared by server and client. No I/O.

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;

// The day part ("YYYY-MM-DD") of a stored datetime ("YYYY-MM-DDTHH:mm").
function dayOf(eatenAt: string): string {
  return eatenAt.slice(0, 10);
}

// Midnight UTC for a "YYYY-MM-DD" day, used only for window comparisons.
function dayStamp(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Average macros/calories PER DAY across the 7-day window ending on `through`
// (inclusive). Days with no meals still count toward the average, so the result
// reflects typical daily intake. Totals are divided by 7.
export function weeklyMacroAverage(
  meals: { eatenAt: string; foods: Food[] }[],
  through: string,
): MacroAverage {
  const end = dayStamp(through);
  const start = end - (WEEK_DAYS - 1) * DAY_MS;

  let carbs = 0;
  let protein = 0;
  let fat = 0;
  let calories = 0;

  for (const meal of meals) {
    const stamp = dayStamp(dayOf(meal.eatenAt));
    if (Number.isNaN(stamp) || stamp < start || stamp > end) continue;
    for (const food of meal.foods) {
      carbs += food.carbs;
      protein += food.protein;
      fat += food.fat;
      calories += caloriesForFood(food);
    }
  }

  return {
    carbs: round1(carbs / WEEK_DAYS),
    protein: round1(protein / WEEK_DAYS),
    fat: round1(fat / WEEK_DAYS),
    calories: round1(calories / WEEK_DAYS),
  };
}
