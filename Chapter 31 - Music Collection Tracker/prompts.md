# Building a Music Collection Tracker — Prompt Log

A step-by-step record of every prompt used to build this app with Claude Code.
The app is a static, no-framework music collection tracker: plain HTML, CSS, and
vanilla JavaScript with localStorage persistence.

---

## 1. Project setup

> We're building a small music collection tracker as a static web app — plain HTML,
> CSS, and vanilla JavaScript (ES modules), no frameworks and no build step. Data
> persists in localStorage. Create a CLAUDE.md that captures this, plus our
> conventions: keep DOM code and data logic in separate files, write small pure
> functions for the data layer, and use CSS custom properties for theming. Don't
> write any app code yet.

---

## 2. Architecture planning

> Propose the file structure and the data model for an album record (artist, album
> title, genre, and an ordered list of songs). Keep the data logic in a module
> that's separate from the DOM so we can unit-test it. Just the plan — no code yet.

Claude asked two clarifying questions before proceeding:

- Should genre be a free-text string or a fixed enum?
- Should search/filter state be persisted, or is it purely transient UI state?

**Answers:**

> Genre free-text. Search and filter is transient.

---

## 3. Core data layer and persistence

> Build the testable core before the UI:
> Implement collection.js as an ES module of pure functions: createAlbum(input)
> that returns a normalized record with a generated id, addAlbum(list, album) and
> removeAlbum(list, id) that return new arrays without mutating the input, and
> validateAlbum(input) that returns an errors object when artist or album title is
> missing. No DOM and no localStorage in this file.
>
> Then the thin persistence layer, kept separate on purpose:
> Add storage.js with load() and save(list) that read and write the collection to
> localStorage under a single JSON key. Nothing else.
>
> Keeping pure logic away from side effects (the DOM, storage, the network) is
> exactly what makes the next step easy.

---

## 4. Unit tests

> Write unit tests for collection.js using Node's built-in test runner (node:test
> and node:assert). Cover createAlbum's defaults, that addAlbum and removeAlbum
> don't mutate their input, and validateAlbum's error cases. Put them in
> collection.test.js.

---

## 5. UI — form and album list

> Build index.html and app.js: a form with fields for artist, album title, genre,
> and a song list (let me add songs one per line), a Save button, and a list below
> that shows each album with its songs. Use collection.js and storage.js so entries
> persist across reloads. Keep app.js focused on the DOM — all data rules stay in
> collection.js.

---

## 6. Visual design

> Style style.css for a clean, modern look: a readable system font stack, a
> centered single column, card-style entries for each album, and comfortable
> spacing. Keep it simple.

---

## 7. Style refinements

Three follow-up prompts to tighten the visual design:

> Don't use the AI slop left glow. Give it a more modern approach.

*(Claude applied a glow to the focus ring. The prompt above fixed that.)*

> I mean the left purple solid line on the album entry. That's a typical AI thing
> to do.

*(Claude had added a left accent border to album cards — a common AI-generated
design pattern. This removed it.)*

---

## 8. Dark mode

> Add dark mode. Default to the system setting via prefers-color-scheme, and add a
> toggle button that overrides it and remembers the choice in localStorage. Put all
> colors in CSS custom properties so light and dark share one set of variables.

---

## 9. Album cover art

First attempt — Claude chose Last.fm (requires an API key):

> Find an API that doesnt require an API key, fetch the cover when I add an album (using the 
> artist and album title), and store the returned image URL on the record so we don't refetch
> it. Show the thumbnail in the list, and fall back to a simple placeholder when
> nothing is found. Tell me which API you picked and why before you wire it in.

Correction after Claude's choice:

> I said I don't want an API that requires a key. How about Apple's iTunes Search
> API?

---

## 10. API citizenship

> Two things to confirm in the result: it stores the URL on the record (so the
> cover is cached in localStorage rather than fetched every render), and it handles
> the "no match" case gracefully instead of breaking the list. Add a real album and
> watch the cover appear.
>
> A small note on being a good API citizen: have Claude handle network errors,
> avoid refetching what you've already stored, and not hammer the endpoint.

---

## 11. Feature batch

> Implement these next 4 features. Ask any clarifying questions you have before
> starting.
>
> - Edit and delete existing albums
> - Search or filter by genre
> - Sort the list by artist
> - Export and import the whole collection as a JSON file

Claude asked clarifying questions before writing any code:

- **Edit:** Inline within the card, or pre-fill the add form? Re-fetch cover if artist/title changes?
- **Delete:** Confirmation step, or immediate?
- **Search:** Free-text across all fields, genre-only dropdown, or both?
- **Sort:** Toggle A→Z / Z→A? Persist across reloads?
- **Import:** Merge with existing collection, or always replace?

**Answers:**

> Edit — 1. inline  2. yes
> Delete — confirm
> Search — free text
> Sort — toggle and yes, persist
> Import — always replace

---

## 12. Grid layout and modal with animation

> I'd like to make the albums small cards and when I click on it, then it provides
> a nice modal with the full album info. It takes up too much space on the UI right
> now. Make them album cover squares in a grid fashion. When clicking the album,
> animate it to the full view using a call to action style animation.

---

## 13. Modal refinements

> For the pop up, make the song listing scrollable if there's more than 8 songs.
> I don't want the main pop up to have a scrollbar. Also, if a genre has more than
> one entry (comma delimited) make a separate badge for each one.

---

## 14. Bug fix — editing in the wrong place

> I found a bug. When editing, it closes the pop up and has the tiny box have all
> the editing. Editing should be done right in the pop up.

---

## Resulting file structure

```
index.html
tokens.css
style.css
app.js
data/
  collection.js        # pure functions — no DOM, no storage
  collection.test.js   # node --test data/collection.test.js
  storage.js           # localStorage read/write only
  covers.js            # iTunes Search API fetch
```

## Key patterns demonstrated

- **Separation of concerns** — pure data functions are independently testable with
  no browser globals required
- **Thin persistence layer** — one file owns all localStorage access
- **No-key public API** — iTunes Search requires no authentication and allows
  browser `fetch()` without CORS issues
- **FLIP animation** — modal opens by snapping to the clicked card's bounding rect,
  then transitions to centre with a spring easing
- **Inline modal state** — the modal swaps its body div between a detail view and
  an edit form without closing and reopening
- **CSS custom properties** — a single set of token names works for both light and
  dark themes; the cascade order determines which values win
