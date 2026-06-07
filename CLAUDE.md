# Music Collection Tracker

Static web app for tracking a personal music collection. No frameworks, no build step, no server.

## Stack

- Plain HTML, CSS, and vanilla JavaScript (ES modules)
- Data persists in `localStorage`
- Served as static files — open `index.html` directly in a browser

## Project conventions

### File separation

Keep DOM manipulation and data logic in separate files. A rough division:

- `data/*.js` — pure functions that read/write to localStorage and transform data (no DOM access)
- `ui/*.js` — functions that query the DOM, render elements, and attach event listeners (no direct localStorage access)
- `main.js` — entry point that wires the two layers together

### Data layer

Write small, pure functions. Each function does one thing and is independently testable:

```js
// good
export function addAlbum(collection, album) { ... }
export function removeAlbum(collection, id) { ... }

// avoid
export function handleAddButtonClick(e) { /* mixed DOM + data logic */ }
```

### Theming

Use CSS custom properties for all colors, spacing, and typography tokens. Define them on `:root` in a dedicated `tokens.css` file. Component stylesheets reference only the tokens, never raw values.

```css
/* tokens.css */
:root {
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-accent: #a78bfa;
  --space-md: 1rem;
}
```

### General

- No TypeScript, no JSX, no transpilation — the code runs as-is in the browser
- Prefer `const` and arrow functions; avoid `var`
- Module imports use relative paths with `.js` extensions (required for native ES modules)
- Do not add a bundler or package manager unless explicitly requested
