import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFood, validateNewMeal } from "./validation.ts";

test("validateNewMeal accepts a well-formed meal", () => {
  const errors = validateNewMeal({
    name: "Lunch",
    eatenAt: "2026-06-10T12:30",
    foods: [{ name: "Rice", carbs: 45, protein: 4, fat: 0 }],
  });
  assert.deepEqual(errors, []);
});

test("validateNewMeal reports missing name, bad datetime, and no foods", () => {
  const errors = validateNewMeal({ name: "  ", eatenAt: "nope", foods: [] });
  assert.equal(errors.length, 3);
  assert.match(errors.join(" "), /name is required/);
  assert.match(errors.join(" "), /date and time/);
  assert.match(errors.join(" "), /at least one food/);
});

test("validateNewMeal flags a bad food row with its index", () => {
  const errors = validateNewMeal({
    name: "Dinner",
    eatenAt: "2026-06-10T18:00",
    foods: [
      { name: "Chicken", carbs: 0, protein: 31, fat: 4 },
      { name: "", carbs: -1, protein: 0, fat: 0 },
    ],
  });
  assert.ok(errors.some((e) => e.startsWith("Food 2")));
  assert.ok(errors.some((e) => /name is required/.test(e)));
  assert.ok(errors.some((e) => /carbs must be a number/.test(e)));
});

test("validateFood rejects non-numeric macros", () => {
  const errors = validateFood({
    name: "Mystery",
    carbs: Number("abc"), // NaN
    protein: 0,
    fat: 0,
  });
  assert.ok(errors.some((e) => /carbs must be a number/.test(e)));
});
