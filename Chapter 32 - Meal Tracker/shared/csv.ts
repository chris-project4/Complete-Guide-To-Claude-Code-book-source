import type { Meal } from "./types.ts";
import { caloriesForFood } from "./calories.ts";

// Pure CSV export shared by server and client. One row per food, carrying its
// meal's context, with calories derived (never read from storage). No I/O.

const HEADER = [
  "meal_id",
  "meal_name",
  "eaten_at",
  "food",
  "fat_g",
  "carbs_g",
  "protein_g",
  "calories",
];

// Quote a field only when it contains a comma, quote, or newline (RFC 4180).
function escape(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function mealsToCsv(meals: Meal[]): string {
  const lines = [HEADER.join(",")];
  for (const meal of meals) {
    for (const food of meal.foods) {
      lines.push(
        [
          meal.id,
          meal.name,
          meal.eatenAt,
          food.name,
          food.fat,
          food.carbs,
          food.protein,
          caloriesForFood(food),
        ]
          .map(escape)
          .join(","),
      );
    }
  }
  return lines.join("\r\n") + "\r\n";
}
