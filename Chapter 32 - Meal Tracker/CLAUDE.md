# Meal Tracker

A small full-stack TypeScript app for logging meals and tracking calories. An
Express REST backend persists data with `better-sqlite3`; a no-framework
TypeScript frontend is compiled and served by the same server.

## Project structure

```
server/   Express REST API + better-sqlite3 persistence; also compiles & serves the client
client/   No-framework TypeScript frontend (no React/Vue/etc.)
shared/   Types and pure logic used by BOTH server and client
```

- `shared/` is the single source of truth for types that cross the wire (e.g.
  the meal/macro shapes). Never duplicate a type in `server/` and `client/` —
  put it in `shared/` and import it from both.
- The server is responsible for compiling the `client/` TypeScript and serving
  the resulting assets. There is no separate frontend dev server or bundler
  toolchain to run.

## Conventions

### Calories are derived, never stored as ground truth

Calories are always computed from macronutrients, never entered or trusted
independently:

- carbs: **4** kcal/g
- protein: **4** kcal/g
- fat: **9** kcal/g

This calculation lives as a pure function in `shared/` so both sides compute
identical values. Don't reimplement it in a route handler or in the DOM.

### Keep pure logic out of route handlers and the DOM

Business/calculation logic must be pure functions that take inputs and return
outputs — no `req`/`res`, no database calls, no DOM access inside them.

- **server/**: route handlers parse the request, call pure functions (from
  `shared/` or a server module), touch the database, and shape the response.
  They contain no calculation logic of their own.
- **client/**: DOM/event code reads values out of the page, calls pure
  functions, and writes results back. Calculation logic never lives inline in
  an event listener.

The point is testability: pure logic can be unit-tested without spinning up
Express, a database, or a browser.

## What to put where

- A new cross-cutting type → `shared/`
- A macro/calorie or other domain calculation → pure function in `shared/`
- An HTTP endpoint → thin handler in `server/` that delegates to pure functions
- A UI interaction → thin DOM code in `client/` that delegates to pure functions
