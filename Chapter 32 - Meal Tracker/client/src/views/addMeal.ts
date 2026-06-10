import { api } from "../api.ts";
import { el, render } from "../dom.ts";
import { validateNewMeal } from "../../../shared/validation.ts";
import type { Food, MealView, NewMeal } from "../../../shared/types.ts";

// The meal form, used for both adding and editing. Date+time default to now for
// a new meal, or to the meal's stored values when editing. It reuses the shared
// validation and POSTs/PUTs a NewMeal.

function nowParts(): { date: string; time: string } {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

// One editable food row (name, fat, carbs, protein), optionally prefilled.
function foodRow(
  onRemove: (row: HTMLElement) => void,
  initial?: Food,
): { row: HTMLElement; read: () => Food } {
  const text = (value: string) =>
    el("input", { type: "text", placeholder: "Food", value }) as HTMLInputElement;
  const number = (value: string) =>
    el("input", { type: "number", min: "0", step: "0.1", placeholder: "0", value }) as HTMLInputElement;

  const name = text(initial?.name ?? "");
  const fat = number(initial ? String(initial.fat) : "");
  const carbs = number(initial ? String(initial.carbs) : "");
  const protein = number(initial ? String(initial.protein) : "");

  const row = el("div", { class: "food-row" }, [
    el("div", {}, [el("label", {}, ["Name"]), name]),
    el("div", {}, [el("label", {}, ["Fat (g)"]), fat]),
    el("div", {}, [el("label", {}, ["Carbs (g)"]), carbs]),
    el("div", {}, [el("label", {}, ["Protein (g)"]), protein]),
    el("div", {}, [
      el("button", { type: "button", class: "link", onClick: () => onRemove(row) }, ["✕"]),
    ]),
  ]);

  // Empty means 0g; anything non-numeric becomes NaN so shared validation flags it.
  const num = (input: HTMLInputElement) =>
    input.value.trim() === "" ? 0 : Number(input.value);
  const read = (): Food => ({
    name: name.value.trim(),
    fat: num(fat),
    carbs: num(carbs),
    protein: num(protein),
  });

  return { row, read };
}

interface FormOptions {
  heading: string;
  submitLabel: string;
  initial?: MealView;
  onSave: (meal: NewMeal) => Promise<unknown>;
  successHash: string;
}

function renderMealForm(host: HTMLElement, opts: FormOptions): void {
  const start = opts.initial
    ? { date: opts.initial.eatenAt.slice(0, 10), time: opts.initial.eatenAt.slice(11, 16) }
    : nowParts();

  const dateInput = el("input", { type: "date", value: start.date }) as HTMLInputElement;
  const timeInput = el("input", { type: "time", value: start.time }) as HTMLInputElement;
  const nameInput = el("input", {
    type: "text",
    placeholder: "e.g. Lunch",
    value: opts.initial?.name ?? "",
  }) as HTMLInputElement;

  const readers: Array<() => Food> = [];
  const rows: HTMLElement[] = [];
  const foodsHost = el("div", {});

  const addRow = (initial?: Food) => {
    const { row, read } = foodRow((r) => {
      r.remove();
      const i = rows.indexOf(r);
      if (i >= 0) {
        rows.splice(i, 1);
        readers.splice(i, 1);
      }
    }, initial);
    rows.push(row);
    readers.push(read);
    foodsHost.append(row);
  };

  // Prefill existing foods when editing, otherwise start with one blank row.
  if (opts.initial && opts.initial.foods.length > 0) {
    opts.initial.foods.forEach((f) => addRow(f));
  } else {
    addRow();
  }

  const errorBox = el("div", { class: "errors", role: "alert" });
  const submitBtn = el("button", { type: "submit", class: "primary" }, [
    opts.submitLabel,
  ]) as HTMLButtonElement;

  const showErrors = (messages: string[]) => {
    if (messages.length === 0) {
      render(errorBox);
      return;
    }
    render(
      errorBox,
      el("ul", { class: "error" }, messages.map((m) => el("li", {}, [m]))),
    );
  };

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const meal: NewMeal = {
      name: nameInput.value.trim(),
      eatenAt: `${dateInput.value}T${timeInput.value}`,
      foods: readers.map((r) => r()),
    };

    // Reuse the same pure validation the server runs — fail fast on the client.
    const errors = validateNewMeal(meal);
    if (errors.length) {
      showErrors(errors);
      return;
    }

    showErrors([]);
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    try {
      await opts.onSave(meal);
      location.hash = opts.successHash;
    } catch (err) {
      showErrors([(err as Error).message]);
      submitBtn.disabled = false;
      submitBtn.textContent = opts.submitLabel;
    }
  };

  const form = el("form", { class: "panel", onSubmit }, [
    el("h2", {}, [opts.heading]),
    el("div", { class: "row" }, [
      el("div", {}, [el("label", {}, ["Date"]), dateInput]),
      el("div", {}, [el("label", {}, ["Time"]), timeInput]),
    ]),
    el("div", { class: "row" }, [
      el("div", {}, [el("label", {}, ["Meal name"]), nameInput]),
    ]),
    el("h3", {}, ["Foods"]),
    foodsHost,
    el("div", { class: "row" }, [
      el("button", { type: "button", onClick: () => addRow() }, ["+ Add food"]),
    ]),
    el("div", { class: "row" }, [submitBtn]),
    errorBox,
  ]);

  render(host, form);
}

export function renderAddMeal(host: HTMLElement): void {
  renderMealForm(host, {
    heading: "Add meal",
    submitLabel: "Save meal",
    onSave: (meal) => api.createMeal(meal),
    successHash: "#/history",
  });
}

export async function renderEditMeal(host: HTMLElement, id: number): Promise<void> {
  render(host, el("p", { class: "muted" }, ["Loading…"]));
  try {
    const meal = await api.getMeal(id);
    renderMealForm(host, {
      heading: "Edit meal",
      submitLabel: "Save changes",
      initial: meal,
      onSave: (updated) => api.updateMeal(id, updated),
      successHash: `#/meals/${id}`,
    });
  } catch (err) {
    render(host, el("p", { class: "error" }, [(err as Error).message]));
  }
}
