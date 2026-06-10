// client/src/api.ts
async function asJson(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
  return await res.json();
}
async function ok(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
}
var jsonInit = (method, meal) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(meal)
});
var api = {
  listMeals: (range = {}) => {
    const qs = new URLSearchParams();
    if (range.from) qs.set("from", range.from);
    if (range.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return fetch(`/api/meals${suffix}`).then((r) => asJson(r));
  },
  getMeal: (id) => fetch(`/api/meals/${id}`).then((r) => asJson(r)),
  createMeal: (meal) => fetch("/api/meals", jsonInit("POST", meal)).then((r) => asJson(r)),
  updateMeal: (id, meal) => fetch(`/api/meals/${id}`, jsonInit("PUT", meal)).then(
    (r) => asJson(r)
  ),
  deleteMeal: (id) => fetch(`/api/meals/${id}`, { method: "DELETE" }).then(ok),
  dailyCalories: () => fetch("/api/stats/daily-calories").then((r) => asJson(r)),
  weeklyAverages: () => fetch("/api/stats/weekly-averages").then((r) => asJson(r)),
  // Where to download the full log; used as an anchor href.
  csvUrl: "/api/export.csv"
};

// client/src/dom.ts
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (typeof value === "boolean") {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}
function render(host, ...nodes) {
  host.replaceChildren(...nodes.map((n) => typeof n === "string" ? document.createTextNode(n) : n));
}

// client/src/chart.ts
var SVG = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
function calorieChart(data) {
  const width = 680;
  const height = 280;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart",
    role: "img",
    "aria-label": "Total calories per day"
  });
  const maxCal = Math.max(100, ...data.map((d) => d.calories));
  const x = (i) => pad.left + (data.length <= 1 ? plotW / 2 : plotW * i / (data.length - 1));
  const y = (cal) => pad.top + plotH - plotH * cal / maxCal;
  for (const frac of [0, 0.5, 1]) {
    const gy = pad.top + plotH - plotH * frac;
    svg.append(
      svgEl("line", {
        x1: pad.left,
        y1: gy,
        x2: width - pad.right,
        y2: gy,
        stroke: "#2a3441"
      })
    );
    const label = svgEl("text", {
      x: pad.left - 8,
      y: gy + 4,
      fill: "#8b98a5",
      "font-size": 11,
      "text-anchor": "end"
    });
    label.textContent = String(Math.round(maxCal * frac));
    svg.append(label);
  }
  if (data.length > 1) {
    const points = data.map((d, i) => `${x(i)},${y(d.calories)}`).join(" ");
    svg.append(
      svgEl("polyline", {
        points,
        fill: "none",
        stroke: "#4fc3f7",
        "stroke-width": 2
      })
    );
  }
  data.forEach((d, i) => {
    svg.append(
      svgEl("circle", { cx: x(i), cy: y(d.calories), r: 4, fill: "#66bb6a" })
    );
    const label = svgEl("text", {
      x: x(i),
      y: height - pad.bottom + 18,
      fill: "#8b98a5",
      "font-size": 11,
      "text-anchor": "middle"
    });
    label.textContent = d.date.slice(5);
    svg.append(label);
  });
  return svg;
}

// client/src/views/home.ts
async function renderHome(host) {
  render(host, el("p", { class: "muted" }, ["Loading\u2026"]));
  try {
    const [daily, weekly] = await Promise.all([
      api.dailyCalories(),
      api.weeklyAverages()
    ]);
    const chartPanel = el("section", { class: "panel" }, [
      el("h2", {}, ["Calories per day"])
    ]);
    if (daily.length === 0) {
      chartPanel.append(
        el("p", { class: "muted" }, [
          "No meals logged yet. Add one to see your chart."
        ])
      );
    } else {
      chartPanel.append(calorieChart(daily));
    }
    render(host, weeklyPanel(weekly), chartPanel);
  } catch (err) {
    render(host, el("p", { class: "error" }, [err.message]));
  }
}
function weeklyPanel(avg) {
  const stat = (label, value, unit) => el("div", { class: "stat" }, [
    el("div", { class: "stat-value" }, [`${value}${unit}`]),
    el("div", { class: "stat-label" }, [label])
  ]);
  return el("section", { class: "panel" }, [
    el("h2", {}, ["Weekly average (per day)"]),
    el("div", { class: "stats" }, [
      stat("Calories", avg.calories, " kcal"),
      stat("Carbs", avg.carbs, " g"),
      stat("Protein", avg.protein, " g"),
      stat("Fat", avg.fat, " g")
    ])
  ]);
}

// shared/validation.ts
var DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isNonNegativeNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}
function validateFood(food, label = "Food") {
  const errors = [];
  if (!isNonEmptyString(food?.name)) errors.push(`${label}: name is required.`);
  for (const macro of ["fat", "carbs", "protein"]) {
    if (!isNonNegativeNumber(food?.[macro])) {
      errors.push(`${label}: ${macro} must be a number of grams (0 or more).`);
    }
  }
  return errors;
}
function validateNewMeal(meal) {
  const errors = [];
  if (!isNonEmptyString(meal.name)) errors.push("Meal name is required.");
  if (typeof meal.eatenAt !== "string" || !DATETIME.test(meal.eatenAt)) {
    errors.push("A valid date and time are required.");
  }
  if (!Array.isArray(meal.foods) || meal.foods.length === 0) {
    errors.push("Add at least one food.");
  } else {
    meal.foods.forEach((food, i) => {
      errors.push(...validateFood(food, `Food ${i + 1}`));
    });
  }
  return errors;
}

// client/src/views/addMeal.ts
function nowParts() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`
  };
}
function foodRow(onRemove, initial) {
  const text = (value) => el("input", { type: "text", placeholder: "Food", value });
  const number = (value) => el("input", { type: "number", min: "0", step: "0.1", placeholder: "0", value });
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
      el("button", { type: "button", class: "link", onClick: () => onRemove(row) }, ["\u2715"])
    ])
  ]);
  const num = (input) => input.value.trim() === "" ? 0 : Number(input.value);
  const read = () => ({
    name: name.value.trim(),
    fat: num(fat),
    carbs: num(carbs),
    protein: num(protein)
  });
  return { row, read };
}
function renderMealForm(host, opts) {
  const start = opts.initial ? { date: opts.initial.eatenAt.slice(0, 10), time: opts.initial.eatenAt.slice(11, 16) } : nowParts();
  const dateInput = el("input", { type: "date", value: start.date });
  const timeInput = el("input", { type: "time", value: start.time });
  const nameInput = el("input", {
    type: "text",
    placeholder: "e.g. Lunch",
    value: opts.initial?.name ?? ""
  });
  const readers = [];
  const rows = [];
  const foodsHost = el("div", {});
  const addRow = (initial) => {
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
  if (opts.initial && opts.initial.foods.length > 0) {
    opts.initial.foods.forEach((f) => addRow(f));
  } else {
    addRow();
  }
  const errorBox = el("div", { class: "errors", role: "alert" });
  const submitBtn = el("button", { type: "submit", class: "primary" }, [
    opts.submitLabel
  ]);
  const showErrors = (messages) => {
    if (messages.length === 0) {
      render(errorBox);
      return;
    }
    render(
      errorBox,
      el("ul", { class: "error" }, messages.map((m) => el("li", {}, [m])))
    );
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const meal = {
      name: nameInput.value.trim(),
      eatenAt: `${dateInput.value}T${timeInput.value}`,
      foods: readers.map((r) => r())
    };
    const errors = validateNewMeal(meal);
    if (errors.length) {
      showErrors(errors);
      return;
    }
    showErrors([]);
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving\u2026";
    try {
      await opts.onSave(meal);
      location.hash = opts.successHash;
    } catch (err) {
      showErrors([err.message]);
      submitBtn.disabled = false;
      submitBtn.textContent = opts.submitLabel;
    }
  };
  const form = el("form", { class: "panel", onSubmit }, [
    el("h2", {}, [opts.heading]),
    el("div", { class: "row" }, [
      el("div", {}, [el("label", {}, ["Date"]), dateInput]),
      el("div", {}, [el("label", {}, ["Time"]), timeInput])
    ]),
    el("div", { class: "row" }, [
      el("div", {}, [el("label", {}, ["Meal name"]), nameInput])
    ]),
    el("h3", {}, ["Foods"]),
    foodsHost,
    el("div", { class: "row" }, [
      el("button", { type: "button", onClick: () => addRow() }, ["+ Add food"])
    ]),
    el("div", { class: "row" }, [submitBtn]),
    errorBox
  ]);
  render(host, form);
}
function renderAddMeal(host) {
  renderMealForm(host, {
    heading: "Add meal",
    submitLabel: "Save meal",
    onSave: (meal) => api.createMeal(meal),
    successHash: "#/history"
  });
}
async function renderEditMeal(host, id) {
  render(host, el("p", { class: "muted" }, ["Loading\u2026"]));
  try {
    const meal = await api.getMeal(id);
    renderMealForm(host, {
      heading: "Edit meal",
      submitLabel: "Save changes",
      initial: meal,
      onSave: (updated) => api.updateMeal(id, updated),
      successHash: `#/meals/${id}`
    });
  } catch (err) {
    render(host, el("p", { class: "error" }, [err.message]));
  }
}

// shared/calories.ts
var KCAL_PER_GRAM = { carbs: 4, protein: 4, fat: 9 };
function caloriesForFood(food) {
  return food.carbs * KCAL_PER_GRAM.carbs + food.protein * KCAL_PER_GRAM.protein + food.fat * KCAL_PER_GRAM.fat;
}
function caloriesForMeal(meal) {
  return meal.foods.reduce((total, food) => total + caloriesForFood(food), 0);
}

// client/src/views/history.ts
async function renderHistory(host) {
  const fromInput = el("input", { type: "date" });
  const toInput = el("input", { type: "date" });
  const listHost = el("div", {});
  const load = async () => {
    const from = fromInput.value || void 0;
    const to = toInput.value || void 0;
    render(listHost, el("p", { class: "muted" }, ["Loading\u2026"]));
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
          el("li", { onClick: () => location.hash = `#/meals/${meal.id}` }, [
            el("div", {}, [
              el("div", {}, [meal.name]),
              el("div", { class: "meta" }, [formatWhen(meal.eatenAt)])
            ]),
            el("div", { class: "cal" }, [`${meal.calories} kcal`])
          ])
        );
      }
      render(listHost, list);
    } catch (err) {
      render(listHost, el("p", { class: "error" }, [err.message]));
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
      el("button", { type: "button", class: "link", onClick: clear }, ["Clear"])
    ])
  ]);
  render(
    host,
    el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("h2", {}, ["History"]),
        el("a", { href: api.csvUrl, class: "btn export-btn", download: "meals.csv" }, [
          "\u2B07 Export CSV"
        ])
      ]),
      filters,
      listHost
    ])
  );
  await load();
}
async function renderMealDetail(host, id) {
  render(host, el("p", { class: "muted" }, ["Loading\u2026"]));
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
          el("th", {}, ["kcal"])
        ])
      ]),
      el(
        "tbody",
        {},
        meal.foods.map(
          (f) => el("tr", {}, [
            el("td", {}, [f.name]),
            el("td", {}, [String(f.fat)]),
            el("td", {}, [String(f.carbs)]),
            el("td", {}, [String(f.protein)]),
            el("td", {}, [String(caloriesForFood(f))])
          ])
        )
      ),
      el("tfoot", {}, [
        el("tr", {}, [
          el("th", {}, ["Total"]),
          el("th", {}, [String(totals.fat)]),
          el("th", {}, [String(totals.carbs)]),
          el("th", {}, [String(totals.protein)]),
          el("th", { class: "cal" }, [String(caloriesForMeal(meal))])
        ])
      ])
    ]);
    const deleteBtn = el("button", { class: "danger" }, [
      "Delete"
    ]);
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${meal.name}"? This cannot be undone.`)) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting\u2026";
      try {
        await api.deleteMeal(id);
        location.hash = "#/history";
      } catch (err) {
        alert(err.message);
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete";
      }
    });
    render(
      host,
      el("section", { class: "panel" }, [
        el("button", { class: "link", onClick: () => location.hash = "#/history" }, [
          "\u2190 Back to history"
        ]),
        el("h2", {}, [meal.name]),
        el("p", { class: "meta" }, [formatWhen(meal.eatenAt)]),
        table,
        el("div", { class: "actions" }, [
          el("a", { href: `#/meals/${id}/edit`, class: "btn" }, ["Edit"]),
          deleteBtn
        ])
      ])
    );
  } catch (err) {
    render(host, el("p", { class: "error" }, [err.message]));
  }
}
function sumMacros(foods) {
  return foods.reduce(
    (t, f) => ({
      fat: t.fat + f.fat,
      carbs: t.carbs + f.carbs,
      protein: t.protein + f.protein
    }),
    { fat: 0, carbs: 0, protein: 0 }
  );
}
function formatWhen(eatenAt) {
  const d = new Date(eatenAt);
  if (Number.isNaN(d.getTime())) return eatenAt;
  return d.toLocaleString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// client/src/main.ts
var app = document.getElementById("app");
function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const editMatch = hash.match(/^\/meals\/(\d+)\/edit$/);
  if (editMatch) {
    setActive("history");
    void renderEditMeal(app, Number(editMatch[1]));
    return;
  }
  const mealMatch = hash.match(/^\/meals\/(\d+)$/);
  if (mealMatch) {
    setActive("history");
    void renderMealDetail(app, Number(mealMatch[1]));
    return;
  }
  switch (hash) {
    case "/add":
      setActive("add");
      renderAddMeal(app);
      break;
    case "/history":
      setActive("history");
      void renderHistory(app);
      break;
    default:
      setActive("home");
      void renderHome(app);
  }
}
function setActive(route2) {
  for (const link of document.querySelectorAll("nav a")) {
    link.classList.toggle("active", link.dataset.route === route2);
  }
}
window.addEventListener("hashchange", route);
route();
//# sourceMappingURL=app.js.map
