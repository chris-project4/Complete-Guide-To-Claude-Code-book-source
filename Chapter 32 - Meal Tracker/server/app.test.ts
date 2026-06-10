import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import Database from "better-sqlite3";
import { initSchema } from "./db.ts";
import { createApp } from "./app.ts";
import type { DailyCalories, MacroAverage, MealView } from "../shared/types.ts";

let server: Server;
let db: Database.Database;
let base: string;

before(async () => {
  // Fresh in-memory database per test run; ephemeral port (0) avoids clashes.
  db = new Database(":memory:");
  initSchema(db);
  const app = createApp(db);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  base = `http://localhost:${port}`;
});

after(() => {
  server.close();
  db.close();
});

test("POST /api/meals creates a meal and returns derived calories", async () => {
  const res = await fetch(`${base}/api/meals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Lunch",
      eatenAt: "2026-06-10T12:30",
      foods: [
        { name: "Rice", carbs: 45, protein: 4, fat: 0 }, // 196
        { name: "Egg", carbs: 1, protein: 6, fat: 5 }, // 73
      ],
    }),
  });

  assert.equal(res.status, 201);
  const meal = (await res.json()) as MealView;
  assert.ok(Number.isInteger(meal.id));
  assert.equal(meal.name, "Lunch");
  assert.equal(meal.eatenAt, "2026-06-10T12:30");
  assert.equal(meal.foods.length, 2);
  assert.equal(meal.calories, 269); // 196 + 73
});

test("POST /api/meals rejects an invalid payload", async () => {
  const res = await fetch(`${base}/api/meals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "", eatenAt: "nope", foods: [] }),
  });
  assert.equal(res.status, 400);
});

test("GET /api/meals lists meals newest-first with calories", async () => {
  // Add a second meal on a later day.
  await fetch(`${base}/api/meals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Snack",
      eatenAt: "2026-06-11T15:00",
      foods: [{ name: "Olive oil", carbs: 0, protein: 0, fat: 14 }], // 126
    }),
  });

  const res = await fetch(`${base}/api/meals`);
  assert.equal(res.status, 200);
  const meals = (await res.json()) as MealView[];
  assert.equal(meals.length, 2);
  // Newest first.
  assert.equal(meals[0].name, "Snack");
  assert.equal(meals[0].eatenAt, "2026-06-11T15:00");
  assert.equal(meals[0].calories, 126);
});

test("GET /api/meals/:id returns one meal with its foods", async () => {
  const list = (await (await fetch(`${base}/api/meals`)).json()) as MealView[];
  const target = list.find((m) => m.name === "Lunch")!;

  const res = await fetch(`${base}/api/meals/${target.id}`);
  assert.equal(res.status, 200);
  const meal = (await res.json()) as MealView;
  assert.equal(meal.id, target.id);
  assert.equal(meal.name, "Lunch");
  assert.equal(meal.foods.length, 2);
  assert.equal(meal.calories, 269);
});

test("GET /api/meals/:id returns 404 for a missing meal", async () => {
  const res = await fetch(`${base}/api/meals/999999`);
  assert.equal(res.status, 404);
});

test("GET /api/stats/daily-calories totals calories per day", async () => {
  const res = await fetch(`${base}/api/stats/daily-calories`);
  assert.equal(res.status, 200);
  const summary = (await res.json()) as DailyCalories[];
  assert.deepEqual(summary, [
    { date: "2026-06-10", calories: 269 },
    { date: "2026-06-11", calories: 126 },
  ]);
});

// A temporary meal created/edited/deleted by the tests below, leaving the two
// base meals (Lunch 2026-06-10, Snack 2026-06-11) intact for later assertions.
let tempId: number;

test("PUT /api/meals/:id edits a meal", async () => {
  const created = (await (
    await fetch(`${base}/api/meals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Temp",
        eatenAt: "2026-06-12T10:00",
        foods: [{ name: "Toast", carbs: 15, protein: 3, fat: 1 }],
      }),
    })
  ).json()) as MealView;
  tempId = created.id;

  const res = await fetch(`${base}/api/meals/${tempId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Edited",
      eatenAt: "2026-06-12T11:30",
      foods: [{ name: "Bagel", carbs: 50, protein: 10, fat: 2 }], // 258
    }),
  });
  assert.equal(res.status, 200);
  const meal = (await res.json()) as MealView;
  assert.equal(meal.id, tempId);
  assert.equal(meal.name, "Edited");
  assert.equal(meal.eatenAt, "2026-06-12T11:30");
  assert.equal(meal.foods[0].name, "Bagel");
  assert.equal(meal.calories, 258);
});

test("PUT and DELETE return 404 for a missing meal", async () => {
  const put = await fetch(`${base}/api/meals/999999`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "x",
      eatenAt: "2026-06-12T11:30",
      foods: [{ name: "y", carbs: 1, protein: 1, fat: 1 }],
    }),
  });
  assert.equal(put.status, 404);

  const del = await fetch(`${base}/api/meals/999999`, { method: "DELETE" });
  assert.equal(del.status, 404);
});

test("DELETE /api/meals/:id removes a meal", async () => {
  const del = await fetch(`${base}/api/meals/${tempId}`, { method: "DELETE" });
  assert.equal(del.status, 204);

  const after = await fetch(`${base}/api/meals/${tempId}`);
  assert.equal(after.status, 404);
});

test("GET /api/meals?from&to filters by date range", async () => {
  const onlyLater = (await (
    await fetch(`${base}/api/meals?from=2026-06-11`)
  ).json()) as MealView[];
  assert.deepEqual(
    onlyLater.map((m) => m.name),
    ["Snack"],
  );

  const onlyFirst = (await (
    await fetch(`${base}/api/meals?from=2026-06-10&to=2026-06-10`)
  ).json()) as MealView[];
  assert.deepEqual(
    onlyFirst.map((m) => m.name),
    ["Lunch"],
  );
});

test("GET /api/stats/weekly-averages averages the 7-day window", async () => {
  // Base meals: Lunch (carbs46/protein10/fat5/269) + Snack (fat14/126).
  // Totals over window ending 2026-06-11: carbs46 protein10 fat19 cal395, /7.
  const res = await fetch(
    `${base}/api/stats/weekly-averages?through=2026-06-11`,
  );
  assert.equal(res.status, 200);
  const avg = (await res.json()) as MacroAverage;
  assert.deepEqual(avg, { carbs: 6.6, protein: 1.4, fat: 2.7, calories: 56.4 });
});

test("GET /api/export.csv returns the log as CSV", async () => {
  const res = await fetch(`${base}/api/export.csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
  const body = await res.text();
  const lines = body.trimEnd().split("\r\n");
  assert.equal(
    lines[0],
    "meal_id,meal_name,eaten_at,food,fat_g,carbs_g,protein_g,calories",
  );
  // Two base meals: Lunch has 2 foods, Snack has 1 -> 3 data rows.
  assert.equal(lines.length, 4);
  assert.match(body, /Olive oil/);
  assert.match(body, /Rice/);
});
