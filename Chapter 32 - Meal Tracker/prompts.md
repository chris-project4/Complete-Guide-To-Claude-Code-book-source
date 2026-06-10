# Building a Meal Tracker — Prompt Log

A step-by-step record of every prompt used to build this app with Claude Code.
The app is a small full-stack TypeScript meal/calorie tracker: an Express REST
backend with `better-sqlite3` persistence, a no-framework TypeScript frontend
compiled and served by the same server, and a `shared/` module of types and pure
logic imported by both sides. Calories are always *derived* from macros, never
stored.

> The project started from a `CLAUDE.md` that captures the structure
> (`server/`, `client/`, `shared/`) and the conventions: calories derived from
> macros via one pure function in `shared/`, and pure logic kept out of route
> handlers and the DOM.

---

## 1. Architecture planning

Run in plan mode (`Just the plan` — no code yet):

> design this app. Propose the folder layout, the REST endpoints, the SQLite
> schema, and a shared types module (Meal and Food) imported by both the server
> and the client. Include an endpoint that returns total calories per day for the
> Home chart. Just the plan.

Claude asked one clarifying question before finalizing the plan:

- How should a logged Meal relate to a Food — reference it, snapshot its macros,
  or carry free-form macros?

**Answer:** Meal references Food (normalized).

---

## 2. Shared types and the calorie calculation

> Create shared/types.ts with Meal and Food types (a Food has name, fat, carbs,
> protein in grams). Then create shared/calories.ts with two pure functions:
> caloriesForFood(food) and caloriesForMeal(meal), using carbs×4 + protein×4 +
> fat×9. No I/O.

---

## 3. Unit tests for the pure logic

> Write tests for shared/calories.ts using Node's built-in test runner. Cover a
> single food, a meal with several foods, and an empty meal. Run node --test (or
> npm test once that's wired up) and watch it pass before going further.

*(On Node 22 this required two adjustments for native TypeScript support:
relative imports need explicit `.ts` extensions, and interfaces must be imported
with `import type` so the type-stripper erases them.)*

---

## 4. Wire up `npm test`

> yes, wire up npm test

*(Added a root `package.json` with `"type": "module"` and
`"test": "node --test --experimental-strip-types"`.)*

---

## 5. The Express server and API tests

> Implement the Express server with better-sqlite3: initialize the schema on
> startup, then the routes for creating a meal, listing meals, fetching one meal
> with its foods, and the daily calorie summary. Then write API tests with Node's
> built-in runner that start the app on a test port and exercise each endpoint
> with fetch.

*(The API tests inject an in-memory database into `createApp(db)` and bind to an
ephemeral port with `listen(0)`, so they need no files or fixed ports.)*

Set a goal to lock in coverage:

> /goal npm test passes, with tests covering creating a meal, listing meals,
> fetching one meal by id, and the daily calorie summary

---

## 6. Fixing the IDE type warnings

> getting an IDE warning for express and better-sql - Could not find a
> declaration file for module 'express'.

*(Installed `@types/express`, `@types/better-sqlite3`, `@types/node`, and
`typescript`, and added a `tsconfig.json` matching how Node runs the code —
`NodeNext` resolution, `allowImportingTsExtensions`, `noEmit`.)*

---

## 7. The TypeScript frontend

> Build the TypeScript frontend, compiled into the folder the server serves, with
> three views behind a simple nav: Home, Add Meal, and History. Add Meal is a
> form — date and time defaulting to now, a meal name, and rows of foods (name,
> fat, carbs, protein) I can add to. History lists meals newest-first; clicking
> one shows its foods and macros. Home shows a line chart of total calories per
> day from the summary endpoint — pick a lightweight charting approach and tell me
> what you chose. Use the shared types and talk to the REST API with fetch.

**Charting choice:** a hand-rolled inline-SVG line chart — zero dependencies.

*(The form's meal **name** and **time** weren't in the original model, so the
shared `Meal` type gained a `name` and an `eatenAt` timestamp, and the schema,
repository, routes, and tests were updated to match. The client is compiled with
**esbuild**, invoked by the server's own build step into `server/public` — there
is no separate frontend toolchain to run.)*

---

## 8. Loading, error, and empty states + shared validation

> Add loading and error states to the fetch calls, empty states for History and
> the chart, and input validation that reuses the shared logic. Keep the styling
> clean and simple.

*(Validation moved into a pure `shared/validation.ts` consumed by **both** the
server route and the Add Meal form, so the rules live in one place.)*

---

## 9. Goal: keep the build and tests green

> /goal both "npx tsc --noEmit" and "npm test" pass

---

## 10. Feature batch — four improvements

> i want to build these final 4 improvements:
>
> - Edit and delete meals
> - Filter History by date range
> - A weekly macro average on the Home view
> - Export the log as CSV

*(Each calculation landed as a tested pure function in `shared/` —
`weeklyMacroAverage` in `stats.ts`, `mealsToCsv` in `csv.ts` — with thin server
endpoints and thin client UI on top. Tests grew from 18 to 24.)*

---

## 11. Polish — style the export button

> style the export button

---

## Resulting file structure

```
CLAUDE.md
package.json            # type: module; build / start / typecheck / test scripts
tsconfig.json           # NodeNext, allowImportingTsExtensions, noEmit
.gitignore

shared/                 # imported by BOTH server and client; pure, no I/O
  types.ts              # Food, Meal, NewMeal, MealView, DailyCalories, MacroAverage
  calories.ts           # caloriesForFood / caloriesForMeal  (the one calc)
  calories.test.ts
  validation.ts         # validateFood / validateNewMeal
  validation.test.ts
  stats.ts              # weeklyMacroAverage
  stats.test.ts
  csv.ts                # mealsToCsv
  csv.test.ts

server/
  db.ts                 # better-sqlite3 connection + schema init
  repository.ts         # typed CRUD; rows <-> shared types; no calc logic
  app.ts                # createApp(db): thin routes + static serving + SPA fallback
  app.test.ts           # API tests over an in-memory DB on an ephemeral port
  index.ts              # bootstrap: build client, open DB, listen
  build-client.ts       # esbuild bundles client -> server/public
  public/               # generated (compiled client assets)
  data/app.db           # generated, gitignored

client/                 # no framework; thin DOM that delegates to shared/
  index.html
  styles.css
  src/
    main.ts             # hash router for the views
    api.ts              # typed fetch wrappers
    dom.ts              # tiny el()/render() helpers
    chart.ts            # dependency-free inline-SVG line chart
    views/
      home.ts           # weekly averages + calorie chart
      addMeal.ts        # add/edit meal form (shared validation)
      history.ts        # filterable list + detail with edit/delete + CSV export
```

## Key patterns demonstrated

- **One source of truth for cross-the-wire types** — `Food`/`Meal` live in
  `shared/` and are imported by server and client; never duplicated.
- **Derived, never stored** — calories have no database column; they are always
  computed from macros through a single shared pure function, so they can't drift.
- **Pure logic out of handlers and the DOM** — calories, validation, weekly
  averages, and CSV are pure functions in `shared/`, each unit-tested in isolation
  with no Express, database, or browser.
- **Injectable app for testing** — `createApp(db)` takes the database as a
  parameter, so API tests run against an in-memory DB on an ephemeral port.
- **Native TypeScript on Node 22** — run directly via `--experimental-strip-types`
  with `.ts` import extensions and `import type` for erasable types; no emit step.
- **Server-owned client build** — esbuild compiles the client into the folder the
  server serves; the user only ever runs the server.
- **Goals to hold the line** — `/goal` keeps `tsc` and the test suite green across
  later changes.
```
