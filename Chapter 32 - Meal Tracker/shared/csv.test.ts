import { test } from "node:test";
import assert from "node:assert/strict";
import { mealsToCsv } from "./csv.ts";
import type { Meal } from "./types.ts";

test("mealsToCsv emits a header and one row per food with derived calories", () => {
  const meals: Meal[] = [
    {
      id: 1,
      name: "Lunch",
      eatenAt: "2026-06-10T12:30",
      foods: [
        { name: "Rice", carbs: 45, protein: 4, fat: 0 }, // 196
        { name: "Egg", carbs: 1, protein: 6, fat: 5 }, // 73
      ],
    },
  ];

  const csv = mealsToCsv(meals);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines[0], "meal_id,meal_name,eaten_at,food,fat_g,carbs_g,protein_g,calories");
  assert.equal(lines[1], "1,Lunch,2026-06-10T12:30,Rice,0,45,4,196");
  assert.equal(lines[2], "1,Lunch,2026-06-10T12:30,Egg,5,1,6,73");
});

test("mealsToCsv quotes fields containing commas or quotes", () => {
  const meals: Meal[] = [
    {
      id: 2,
      name: 'Sam\'s "big" meal, deluxe',
      eatenAt: "2026-06-11T08:00",
      foods: [{ name: "Beans, refried", carbs: 20, protein: 7, fat: 1 }],
    },
  ];

  const row = mealsToCsv(meals).trimEnd().split("\r\n")[1];
  assert.equal(
    row,
    '2,"Sam\'s ""big"" meal, deluxe",2026-06-11T08:00,"Beans, refried",1,20,7,117',
  );
});
