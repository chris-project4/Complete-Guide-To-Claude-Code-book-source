# Music Collection Tracker

Source code for the hands-on tutorial in **The Complete Guide to Claude Code**.

> The book is now available, find it on Amazon!
> https://www.amazon.com/dp/B0H4R3WGTH
> I also put out a quick start guide:
> https://www.amazon.com/dp/B0H47D1RC5

---

## What this is

A fully working music collection tracker built step-by-step using Claude Code,
exactly as shown in the book's tutorial chapter. The app is intentionally
simple by design — no frameworks, no build tools, no dependencies — so the
focus stays on how to work with Claude Code rather than on the stack itself.

**Features:**

- Add albums with artist, title, genre, and a track listing
- Album cover art fetched automatically via the iTunes Search API (no key needed)
- Grid layout with a FLIP-animated modal for full album detail
- Edit and delete albums directly from the modal
- Search across artist, title, and genre
- Sort by artist A → Z or Z → A (persisted across reloads)
- Export and import your collection as a JSON file
- Light and dark mode, defaulting to system preference

---

## Running it

No install step. Open `index.html` directly in a browser.

If album cover art doesn't load (CORS restriction on `file://` origins in some
browsers), serve the folder over HTTP instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

To run the unit tests for the data layer:

```bash
node --test data/collection.test.js
```

Requires Node 18+.

---

## How the tutorial is structured

The book walks through building this app prompt by prompt, explaining the
reasoning behind each decision. The commit history mirrors the tutorial steps.
`prompts.md` in this repository contains every prompt used, in order, so you
can follow along or replay the session yourself.
