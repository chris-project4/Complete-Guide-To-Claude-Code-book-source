import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import type { DB } from "./db.ts";
import * as repo from "./repository.ts";
import { caloriesForFood, caloriesForMeal } from "../shared/calories.ts";
import { validateNewMeal } from "../shared/validation.ts";
import { weeklyMacroAverage } from "../shared/stats.ts";
import { mealsToCsv } from "../shared/csv.ts";
import type { DailyCalories, Meal, MealView, NewMeal } from "../shared/types.ts";

// Local "YYYY-MM-DD" for today, used as the default end of the weekly window.
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "public");

// Build the Express app over a given database. Routes stay thin: they parse the
// request, call the repository, apply the shared pure calorie functions, and
// shape the response — no calculation logic of their own.
export function createApp(db: DB) {
  const app = express();
  app.use(express.json());

  // Attach the derived calorie total to a stored meal for the response.
  const toView = (meal: Meal): MealView => ({
    ...meal,
    calories: caloriesForMeal(meal),
  });

  // Create a meal.
  app.post("/api/meals", (req, res) => {
    const body = req.body as Partial<NewMeal>;
    const errors = validateNewMeal(body);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const meal = repo.createMeal(db, {
      name: body.name!,
      eatenAt: body.eatenAt!,
      foods: body.foods!,
    });
    res.status(201).json(toView(meal));
  });

  // List meals (newest first), optionally filtered by ?from=&to= (YYYY-MM-DD).
  app.get("/api/meals", (req, res) => {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    res.json(repo.listMeals(db, { from, to }).map(toView));
  });

  // Fetch one meal with its foods.
  app.get("/api/meals/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });

    const meal = repo.getMeal(db, id);
    if (!meal) return res.status(404).json({ error: "meal not found" });
    res.json(toView(meal));
  });

  // Edit a meal (replaces name, time, and foods).
  app.put("/api/meals/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });

    const body = req.body as Partial<NewMeal>;
    const errors = validateNewMeal(body);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const meal = repo.updateMeal(db, id, {
      name: body.name!,
      eatenAt: body.eatenAt!,
      foods: body.foods!,
    });
    if (!meal) return res.status(404).json({ error: "meal not found" });
    res.json(toView(meal));
  });

  // Delete a meal.
  app.delete("/api/meals/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });

    if (!repo.deleteMeal(db, id)) {
      return res.status(404).json({ error: "meal not found" });
    }
    res.status(204).end();
  });

  // Daily calorie summary for the Home chart: total calories per day.
  app.get("/api/stats/daily-calories", (_req, res) => {
    const totals = new Map<string, number>();
    for (const { day, food } of repo.allFoodsByDay(db)) {
      totals.set(day, (totals.get(day) ?? 0) + caloriesForFood(food));
    }
    const summary: DailyCalories[] = [...totals.entries()]
      .map(([date, calories]) => ({ date, calories }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json(summary);
  });

  // Average macros/calories per day over the 7-day window ending on ?through=
  // (defaults to today).
  app.get("/api/stats/weekly-averages", (req, res) => {
    const through =
      typeof req.query.through === "string" ? req.query.through : today();
    res.json(weeklyMacroAverage(repo.listMeals(db), through));
  });

  // Export the whole log as CSV (one row per food).
  app.get("/api/export.csv", (_req, res) => {
    res.type("text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="meals.csv"');
    res.send(mealsToCsv(repo.listMeals(db)));
  });

  // Serve the compiled client. API routes above are matched first; everything
  // else falls back to index.html so the client-side nav owns its routes.
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(join(publicDir, "index.html"), (err) => {
      if (err) next();
    });
  });

  return app;
}
