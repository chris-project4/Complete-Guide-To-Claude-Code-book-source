# Music Collection Tracker

Static web app for tracking a personal music collection. No frameworks, no build
step, no server required.

## Stack

- Plain HTML, CSS, and vanilla JavaScript (ES modules)
- Data persists in `localStorage`
- Open `index.html` directly in a browser. If the iTunes cover-art fetch fails due
  to CORS on a `file://` origin, serve with `python -m http.server 8000` instead.

## File structure

```
index.html            # markup — form, toolbar, grid container
tokens.css            # CSS custom property definitions (light + dark)
style.css             # component styles — references tokens only, no raw values
app.js                # entry point — wires data layer to DOM, owns all UI logic

data/
  collection.js       # pure functions: no DOM, no localStorage
  storage.js          # localStorage only
  covers.js           # iTunes Search API fetch — side-effectful, no DOM
  collection.test.js  # node --test data/collection.test.js
```

> The original plan included a `ui/` directory and `main.js`. The project settled
> on a single `app.js` — simpler for this scale.

## Non-obvious decisions

**Genre** is stored as a plain comma-separated string (`"Rock, Indie"`). The UI
splits on commas to render individual badge elements. Keep that split in the UI
layer — the data model stays a string.

**Cover URLs** are stored on the album record after the first successful fetch and
never re-fetched. `loadCover` in `app.js` guards on `album.coverUrl` before
hitting the API.

**Theming cascade:** `tokens.css` defines light as the `:root` default, dark via
`@media (prefers-color-scheme: dark)`, then `[data-theme="light"]` and
`[data-theme="dark"]` come after in source order. Same specificity, later position
wins — the explicit attribute always beats the media query without `!important`.

**No flash of wrong theme:** an inline `<script>` in `<head>` reads `localStorage`
and sets `data-theme` on `<html>` synchronously before the first paint. ES modules
are deferred, so `app.js` would be too late for this.

**Modal edit state:** the modal has two states (detail / edit) that swap the
`.modal-body` div in-place. The `<dialog>` stays open — no close-and-reopen — so
the cover image and close button remain mounted throughout.

## Running tests

```
node --test data/collection.test.js
```

Requires Node 18+. Uses the built-in `node:test` and `node:assert` — nothing to
install.

## Conventions

- No TypeScript, no JSX, no transpilation
- Module imports use relative paths with `.js` extensions (required for native ES modules)
- Do not add a bundler or package manager unless explicitly requested
- Comments only where the *why* is non-obvious
