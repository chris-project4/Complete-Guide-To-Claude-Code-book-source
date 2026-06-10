import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyMacroAverage } from "./stats.ts";

const meals = [
  { eatenAt: "2026-06-10T12:30", foods: [{ name: "Rice", carbs: 45, protein: 4, fat: 0 }] },
  { eatenAt: "2026-06-11T19:00", foods: [{ name: "Chicken", carbs: 0, protein: 31, fat: 4 }] },
];

test("weeklyMacroAverage averages totals over 7 days", () => {
  // Window 2026-06-05..2026-06-11 includes both meals.
  // carbs 45/7=6.4, protein 35/7=5.0, fat 4/7=0.6, cal 356/7=50.9
  const avg = weeklyMacroAverage(meals, "2026-06-11");
  assert.deepEqual(avg, { carbs: 6.4, protein: 5, fat: 0.6, calories: 50.9 });
});

test("weeklyMacroAverage excludes meals outside the 7-day window", () => {
  const withOld = [
    ...meals,
    { eatenAt: "2026-06-01T08:00", foods: [{ name: "Old", carbs: 700, protein: 0, fat: 0 }] },
  ];
  // The old meal (2026-06-01) is before the window start, so it is ignored.
  const avg = weeklyMacroAverage(withOld, "2026-06-11");
  assert.deepEqual(avg, { carbs: 6.4, protein: 5, fat: 0.6, calories: 50.9 });
});

test("weeklyMacroAverage is all zeros when nothing is in range", () => {
  const avg = weeklyMacroAverage(meals, "2026-01-01");
  assert.deepEqual(avg, { carbs: 0, protein: 0, fat: 0, calories: 0 });
});
