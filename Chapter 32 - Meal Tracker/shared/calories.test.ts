import { test } from "node:test";
import assert from "node:assert/strict";
import { caloriesForFood, caloriesForMeal } from "./calories.ts";
import type { Food } from "./types.ts";

test("caloriesForFood derives calories from a single food's macros", () => {
  const food: Food = { name: "Chicken breast", carbs: 0, protein: 31, fat: 4 };
  // 0*4 + 31*4 + 4*9 = 124 + 36 = 160
  assert.equal(caloriesForFood(food), 160);
});

test("caloriesForMeal sums the calories of several foods", () => {
  const meal = {
    foods: [
      { name: "Rice", carbs: 45, protein: 4, fat: 0 }, // 180 + 16 + 0  = 196
      { name: "Egg", carbs: 1, protein: 6, fat: 5 }, //   4 + 24 + 45 = 73
      { name: "Olive oil", carbs: 0, protein: 0, fat: 14 }, //   0 + 0 + 126 = 126
    ],
  };
  // 196 + 73 + 126 = 395
  assert.equal(caloriesForMeal(meal), 395);
});

test("caloriesForMeal returns 0 for an empty meal", () => {
  const meal = { foods: [] };
  assert.equal(caloriesForMeal(meal), 0);
});
