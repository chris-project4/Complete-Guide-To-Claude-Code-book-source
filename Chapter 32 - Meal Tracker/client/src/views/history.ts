import { api } from "../api.ts";
import { el, render } from "../dom.ts";
import { caloriesForFood, caloriesForMeal } from "../../../shared/calories.ts";
import type { Food } from "../../../shared/types.ts";

// History: meals newest-first, filterable by date range, with a CSV export link.
// Clicking a meal routes to its detail view.
export async function renderHistory(host: HTMLElement): Promise<void> {
  const fromInput = el("input", { type: "date" }) as HTMLInputElement;
  const toInput = el("input", { type: "date" }) as HTMLInputElement;
  const listHost = el("div", {});

  const load = async () => {
    const from = fromInput.value || undefined;
    const to = toInput.value || undefined;
    render(listHost, el("p", { class: "muted" }, ["Loading…"]));
    try {
      const meals = await api.listMeals({ from, to });
      if (meals.length === 0) {
        const msg = from || to ? "No meals in this date range." : "No meals logged yet.";
        render(listHost, el("p", { class: "muted" }, [msg]));
        return;
      }
      const list = el("ul", { class: "meal-list" });
      for (const meal of meals) {
        list.append(
          el("li", { onClick: () => (location.hash = `#/meals/${meal.id}`) }, [
            el("div", {}, [
              el("div", {}, [meal.name]),
              el("div", { class: "meta" }, [formatWhen(meal.eatenAt)]),
            ]),
            el("div", { class: "cal" }, [`${meal.calories} kcal`]),
          ]),
        );
      }
      render(listHost, list);
    } catch (err) {
      render(listHost, el("p", { class: "error" }, [(err as Error).message]));
    }
  };

  const clear = () => {
    fromInput.value = "";
    toInput.value = "";
    void load();
  };

  const filters = el("div", { class: "filters" }, [
    el("div", {}, [el("label", {}, ["From"]), fromInput]),
    el("div", {}, [el("label", {}, ["To"]), toInput]),
    el("div", { class: "filter-actions" }, [
      el("button", { type: "button", onClick: () => void load() }, ["Apply"]),
      el("button", { type: "button", class: "link", onClick: clear }, ["Clear"]),
    ]),
  ]);

  render(
    host,
    el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("h2", {}, ["History"]),
        el("a", { href: api.csvUrl, class: "btn export-btn", download: "meals.csv" }, [
          "⬇ Export CSV",
        ]),
      ]),
      filters,
      listHost,
    ]),
  );

  await load();
}

// Detail: a single meal's foods and macros, with edit and delete actions.
export async function renderMealDetail(host: HTMLElement, id: number): Promise<void> {
  render(host, el("p", { class: "muted" }, ["Loading…"]));
  try {
    const meal = await api.getMeal(id);
    const totals = sumMacros(meal.foods);

    const table = el("table", {}, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["Food"]),
          el("th", {}, ["Fat (g)"]),
          el("th", {}, ["Carbs (g)"]),
          el("th", {}, ["Protein (g)"]),
          el("th", {}, ["kcal"]),
        ]),
      ]),
      el(
        "tbody",
        {},
        meal.foods.map((f) =>
          el("tr", {}, [
            el("td", {}, [f.name]),
            el("td", {}, [String(f.fat)]),
            el("td", {}, [String(f.carbs)]),
            el("td", {}, [String(f.protein)]),
            el("td", {}, [String(caloriesForFood(f))]),
          ]),
        ),
      ),
      el("tfoot", {}, [
        el("tr", {}, [
          el("th", {}, ["Total"]),
          el("th", {}, [String(totals.fat)]),
          el("th", {}, [String(totals.carbs)]),
          el("th", {}, [String(totals.protein)]),
          el("th", { class: "cal" }, [String(caloriesForMeal(meal))]),
        ]),
      ]),
    ]);

    const deleteBtn = el("button", { class: "danger" }, [
      "Delete",
    ]) as HTMLButtonElement;
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${meal.name}"? This cannot be undone.`)) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting…";
      try {
        await api.deleteMeal(id);
        location.hash = "#/history";
      } catch (err) {
        alert((err as Error).message);
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete";
      }
    });

    render(
      host,
      el("section", { class: "panel" }, [
        el("button", { class: "link", onClick: () => (location.hash = "#/history") }, [
          "← Back to history",
        ]),
        el("h2", {}, [meal.name]),
        el("p", { class: "meta" }, [formatWhen(meal.eatenAt)]),
        table,
        el("div", { class: "actions" }, [
          el("a", { href: `#/meals/${id}/edit`, class: "btn" }, ["Edit"]),
          deleteBtn,
        ]),
      ]),
    );
  } catch (err) {
    render(host, el("p", { class: "error" }, [(err as Error).message]));
  }
}

function sumMacros(foods: Food[]): { fat: number; carbs: number; protein: number } {
  return foods.reduce(
    (t, f) => ({
      fat: t.fat + f.fat,
      carbs: t.carbs + f.carbs,
      protein: t.protein + f.protein,
    }),
    { fat: 0, carbs: 0, protein: 0 },
  );
}

// "2026-06-10T12:30" -> "Jun 10, 2026, 12:30".
function formatWhen(eatenAt: string): string {
  const d = new Date(eatenAt);
  if (Number.isNaN(d.getTime())) return eatenAt;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
