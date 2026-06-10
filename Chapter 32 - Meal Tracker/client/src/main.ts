import { renderHome } from "./views/home.ts";
import { renderAddMeal, renderEditMeal } from "./views/addMeal.ts";
import { renderHistory, renderMealDetail } from "./views/history.ts";

// Hash-based router for the views. Each handler renders into #app.
const app = document.getElementById("app")!;

function route(): void {
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

// Highlight the active nav link.
function setActive(route: "home" | "add" | "history"): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("nav a")) {
    link.classList.toggle("active", link.dataset.route === route);
  }
}

window.addEventListener("hashchange", route);
route();
