# Meal Tracker

Source code for the hands-on tutorial in **The Complete Guide to Claude Code**.

> The book is not yet available. When it launches, find it on Amazon.
> In the mean time, this is the "quick start" version:
> https://www.amazon.com/dp/B0H47D1RC5

---

## What this is

A small full-stack TypeScript meal and calorie tracker built step-by-step using
Claude Code, exactly as shown in the book's tutorial chapter. An Express REST
backend persists data with `better-sqlite3`; a no-framework TypeScript frontend
is compiled and served by the same server. A `shared/` module of types and pure
logic is imported by both sides — and calories are always *derived* from macros,
never stored.

**Features:**

- Log meals with a date, time, name, and rows of foods (fat, carbs, protein in grams)
- Calories derived from macros via one shared pure function (carbs×4 + protein×4 + fat×9)
- Home view with a weekly macro average and a dependency-free inline-SVG calorie chart
- History list (newest-first) with a detail view, plus edit and delete
- Filter History by date range
- Export the log as a CSV file
- Shared input validation reused by both the server route and the form
- Loading, error, and empty states throughout

---

## Running it

Requires Node 22+ (the app runs TypeScript directly via
`--experimental-strip-types`, no emit step).

```bash
npm install
npm start
# then open the URL the server prints (http://localhost:3000)
```

`npm start` boots the server, which first builds the client with esbuild into
`server/public`, opens the SQLite database, and starts listening. There is no
separate frontend dev server or bundler to run.

To run the unit and API tests:

```bash
npm test
```

To type-check without emitting:

```bash
npm run typecheck
```

---

## How the tutorial is structured

The book walks through building this app prompt by prompt, explaining the
reasoning behind each decision. The commit history mirrors the tutorial steps.
`prompts.md` in this repository contains every prompt used, in order, so you
can follow along or replay the session yourself.
