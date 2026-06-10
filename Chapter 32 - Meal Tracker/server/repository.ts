import type { DB } from "./db.ts";
import type { Food, Meal, NewMeal } from "../shared/types.ts";

// Raw row shapes as stored (snake_case). Mapped to camelCase shared types here.
interface MealRow {
  id: number;
  name: string;
  eaten_at: string;
}
interface FoodRow {
  name: string;
  carbs: number;
  protein: number;
  fat: number;
}

// Insert a meal and its foods in a single transaction; return the stored Meal.
export function createMeal(db: DB, input: NewMeal): Meal {
  const insertMeal = db.prepare(
    "INSERT INTO meals (name, eaten_at) VALUES (?, ?)",
  );
  const insertFood = db.prepare(
    "INSERT INTO foods (meal_id, name, carbs, protein, fat) VALUES (?, ?, ?, ?, ?)",
  );

  const tx = db.transaction((meal: NewMeal): number => {
    const { lastInsertRowid } = insertMeal.run(meal.name, meal.eatenAt);
    const mealId = Number(lastInsertRowid);
    for (const f of meal.foods) {
      insertFood.run(mealId, f.name, f.carbs, f.protein, f.fat);
    }
    return mealId;
  });

  const id = tx(input);
  return { id, name: input.name, eatenAt: input.eatenAt, foods: input.foods };
}

// All meals, newest first, each with its foods attached. An optional inclusive
// date range (YYYY-MM-DD) filters by the day part of the meal's timestamp.
export function listMeals(
  db: DB,
  range: { from?: string; to?: string } = {},
): Meal[] {
  const where: string[] = [];
  const params: string[] = [];
  if (range.from) {
    where.push("substr(eaten_at, 1, 10) >= ?");
    params.push(range.from);
  }
  if (range.to) {
    where.push("substr(eaten_at, 1, 10) <= ?");
    params.push(range.to);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const mealRows = db
    .prepare(
      `SELECT id, name, eaten_at FROM meals ${clause} ORDER BY eaten_at DESC, id DESC`,
    )
    .all(...params) as MealRow[];
  return mealRows.map((row) => ({
    id: row.id,
    name: row.name,
    eatenAt: row.eaten_at,
    foods: foodsForMeal(db, row.id),
  }));
}

// Replace a meal's name, time, and foods. Returns the updated meal, or
// undefined if no meal has that id.
export function updateMeal(
  db: DB,
  id: number,
  input: NewMeal,
): Meal | undefined {
  const updateRow = db.prepare(
    "UPDATE meals SET name = ?, eaten_at = ? WHERE id = ?",
  );
  const clearFoods = db.prepare("DELETE FROM foods WHERE meal_id = ?");
  const insertFood = db.prepare(
    "INSERT INTO foods (meal_id, name, carbs, protein, fat) VALUES (?, ?, ?, ?, ?)",
  );

  const tx = db.transaction((meal: NewMeal): boolean => {
    const { changes } = updateRow.run(meal.name, meal.eatenAt, id);
    if (changes === 0) return false;
    clearFoods.run(id);
    for (const f of meal.foods) {
      insertFood.run(id, f.name, f.carbs, f.protein, f.fat);
    }
    return true;
  });

  if (!tx(input)) return undefined;
  return { id, name: input.name, eatenAt: input.eatenAt, foods: input.foods };
}

// Delete a meal (its foods cascade). Returns true if a row was removed.
export function deleteMeal(db: DB, id: number): boolean {
  const { changes } = db.prepare("DELETE FROM meals WHERE id = ?").run(id);
  return changes > 0;
}

// A single meal with its foods, or undefined if it does not exist.
export function getMeal(db: DB, id: number): Meal | undefined {
  const row = db
    .prepare("SELECT id, name, eaten_at FROM meals WHERE id = ?")
    .get(id) as MealRow | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    eatenAt: row.eaten_at,
    foods: foodsForMeal(db, row.id),
  };
}

// Every food paired with the day (YYYY-MM-DD) of the meal it belongs to.
// Calorie summing is done by the caller (a pure function) — we only read rows.
export function allFoodsByDay(db: DB): { day: string; food: Food }[] {
  const rows = db
    .prepare(
      `SELECT substr(m.eaten_at, 1, 10) AS day, f.name, f.carbs, f.protein, f.fat
         FROM foods f
         JOIN meals m ON m.id = f.meal_id`,
    )
    .all() as (FoodRow & { day: string })[];
  return rows.map((r) => ({
    day: r.day,
    food: { name: r.name, carbs: r.carbs, protein: r.protein, fat: r.fat },
  }));
}

function foodsForMeal(db: DB, mealId: number): Food[] {
  const rows = db
    .prepare(
      "SELECT name, carbs, protein, fat FROM foods WHERE meal_id = ? ORDER BY id",
    )
    .all(mealId) as FoodRow[];
  return rows.map((r) => ({
    name: r.name,
    carbs: r.carbs,
    protein: r.protein,
    fat: r.fat,
  }));
}
