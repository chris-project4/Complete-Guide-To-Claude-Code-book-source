import type { Food, NewMeal } from "./types.ts";

// Pure validation shared by BOTH server and client, so the rules live in one
// place. Each function returns a list of human-readable error messages —
// an empty array means "valid". No I/O, no DOM, no Express.

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/; // "YYYY-MM-DDTHH:mm"

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

// Validate one food. `label` is used to prefix messages (e.g. "Food 2").
export function validateFood(food: Partial<Food>, label = "Food"): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(food?.name)) errors.push(`${label}: name is required.`);
  for (const macro of ["fat", "carbs", "protein"] as const) {
    if (!isNonNegativeNumber(food?.[macro])) {
      errors.push(`${label}: ${macro} must be a number of grams (0 or more).`);
    }
  }
  return errors;
}

// Validate a create-meal payload (name, datetime, and at least one food).
export function validateNewMeal(meal: Partial<NewMeal>): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(meal.name)) errors.push("Meal name is required.");
  if (typeof meal.eatenAt !== "string" || !DATETIME.test(meal.eatenAt)) {
    errors.push("A valid date and time are required.");
  }
  if (!Array.isArray(meal.foods) || meal.foods.length === 0) {
    errors.push("Add at least one food.");
  } else {
    meal.foods.forEach((food, i) => {
      errors.push(...validateFood(food, `Food ${i + 1}`));
    });
  }
  return errors;
}
