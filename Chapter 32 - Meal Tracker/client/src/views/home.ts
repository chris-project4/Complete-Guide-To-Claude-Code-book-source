import { api } from "../api.ts";
import { el, render } from "../dom.ts";
import { calorieChart } from "../chart.ts";
import type { MacroAverage } from "../../../shared/types.ts";

// Home: a weekly macro average summary plus a line chart of calories per day.
export async function renderHome(host: HTMLElement): Promise<void> {
  render(host, el("p", { class: "muted" }, ["Loading…"]));
  try {
    const [daily, weekly] = await Promise.all([
      api.dailyCalories(),
      api.weeklyAverages(),
    ]);

    const chartPanel = el("section", { class: "panel" }, [
      el("h2", {}, ["Calories per day"]),
    ]);
    if (daily.length === 0) {
      chartPanel.append(
        el("p", { class: "muted" }, [
          "No meals logged yet. Add one to see your chart.",
        ]),
      );
    } else {
      chartPanel.append(calorieChart(daily));
    }

    render(host, weeklyPanel(weekly), chartPanel);
  } catch (err) {
    render(host, el("p", { class: "error" }, [(err as Error).message]));
  }
}

// The weekly average card: per-day averages over the last 7 days.
function weeklyPanel(avg: MacroAverage): HTMLElement {
  const stat = (label: string, value: number, unit: string) =>
    el("div", { class: "stat" }, [
      el("div", { class: "stat-value" }, [`${value}${unit}`]),
      el("div", { class: "stat-label" }, [label]),
    ]);

  return el("section", { class: "panel" }, [
    el("h2", {}, ["Weekly average (per day)"]),
    el("div", { class: "stats" }, [
      stat("Calories", avg.calories, " kcal"),
      stat("Carbs", avg.carbs, " g"),
      stat("Protein", avg.protein, " g"),
      stat("Fat", avg.fat, " g"),
    ]),
  ]);
}
