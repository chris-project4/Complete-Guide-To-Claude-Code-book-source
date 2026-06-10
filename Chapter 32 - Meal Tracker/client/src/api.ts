import type {
  DailyCalories,
  MacroAverage,
  MealView,
  NewMeal,
} from "../../shared/types.ts";

// Thin fetch wrappers over the REST API, typed with the shared wire types.
// No DOM or calculation here — callers handle rendering.

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function ok(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
}

const jsonInit = (method: string, meal: NewMeal): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(meal),
});

export interface DateRange {
  from?: string;
  to?: string;
}

export const api = {
  listMeals: (range: DateRange = {}) => {
    const qs = new URLSearchParams();
    if (range.from) qs.set("from", range.from);
    if (range.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return fetch(`/api/meals${suffix}`).then((r) => asJson<MealView[]>(r));
  },

  getMeal: (id: number) =>
    fetch(`/api/meals/${id}`).then((r) => asJson<MealView>(r)),

  createMeal: (meal: NewMeal) =>
    fetch("/api/meals", jsonInit("POST", meal)).then((r) => asJson<MealView>(r)),

  updateMeal: (id: number, meal: NewMeal) =>
    fetch(`/api/meals/${id}`, jsonInit("PUT", meal)).then((r) =>
      asJson<MealView>(r),
    ),

  deleteMeal: (id: number) =>
    fetch(`/api/meals/${id}`, { method: "DELETE" }).then(ok),

  dailyCalories: () =>
    fetch("/api/stats/daily-calories").then((r) => asJson<DailyCalories[]>(r)),

  weeklyAverages: () =>
    fetch("/api/stats/weekly-averages").then((r) => asJson<MacroAverage>(r)),

  // Where to download the full log; used as an anchor href.
  csvUrl: "/api/export.csv",
};
