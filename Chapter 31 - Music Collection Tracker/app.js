import { load, save } from './data/storage.js';
import {
  createAlbum, addAlbum, removeAlbum, updateAlbum, validateAlbum,
  filterCollection, sortByArtist,
} from './data/collection.js';
import { fetchCover } from './data/covers.js';

let collection = load();

const form         = document.getElementById('album-form');
const collectionEl = document.getElementById('collection');

// ── Theme ─────────────────────────────────────────────────────────────────────

const THEME_KEY   = 'music-theme';
const themeToggle = document.getElementById('theme-toggle');

function effectiveTheme() {
  return document.documentElement.dataset.theme
    ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function syncToggleLabel() {
  themeToggle.textContent = effectiveTheme() === 'dark' ? 'Light' : 'Dark';
}

themeToggle.addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  syncToggleLabel();
});

syncToggleLabel();

// ── Search & sort ─────────────────────────────────────────────────────────────

const SORT_KEY      = 'music-sort';
const searchEl      = document.getElementById('search');
const sortToggleBtn = document.getElementById('sort-toggle');

let searchQuery   = '';
let sortDirection = localStorage.getItem(SORT_KEY) ?? 'asc';

function syncSortLabel() {
  sortToggleBtn.textContent = sortDirection === 'asc' ? 'A → Z' : 'Z → A';
}

searchEl.addEventListener('input', () => { searchQuery = searchEl.value; renderCollection(); });

sortToggleBtn.addEventListener('click', () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  localStorage.setItem(SORT_KEY, sortDirection);
  syncSortLabel();
  renderCollection();
});

syncSortLabel();

// ── Export / import ───────────────────────────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'music-collection.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error();
      collection = imported; save(collection); renderCollection();
    } catch { /* invalid file — leave collection untouched */ }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ── Shared form helpers ───────────────────────────────────────────────────────

function parseSongs(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
    .map((title, i) => ({ track: i + 1, title }));
}

function clearErrors(root = form) {
  root.querySelectorAll('.error-msg').forEach(el => el.remove());
  root.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function showErrors(errors, root = form) {
  clearErrors(root);
  for (const [field] of Object.entries(errors)) {
    const input = root.elements?.[field] ?? root.querySelector(`[name="${field}"]`);
    if (!input) continue;
    input.classList.add('error');
    const p = document.createElement('p');
    p.className   = 'error-msg';
    p.textContent = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
    input.insertAdjacentElement('afterend', p);
  }
  root.querySelector('.error')?.focus();
}

function makeField(labelText, name, value) {
  const lbl       = document.createElement('label');
  lbl.className   = 'edit-label';
  lbl.htmlFor     = `medit-${name}`;
  lbl.textContent = labelText;
  const input     = document.createElement('input');
  input.id        = `medit-${name}`;
  input.name      = name;
  input.type      = 'text';
  input.value     = value;
  input.autocomplete = 'off';
  lbl.append(input);
  return lbl;
}

// ── Cover helpers ─────────────────────────────────────────────────────────────

function placeholderColor(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(h) % 360}, 35%, 35%)`;
}

function buildCardCover(album) {
  if (album.coverUrl) {
    const img     = document.createElement('img');
    img.className = 'card-cover';
    img.src       = album.coverUrl;
    img.alt       = '';
    img.loading   = 'lazy';
    return img;
  }
  const ph = document.createElement('div');
  ph.className = 'card-cover card-cover--placeholder';
  ph.style.setProperty('--ph-bg', placeholderColor(album.artist));
  ph.textContent = album.artist.charAt(0).toUpperCase();
  return ph;
}

function swapCover(card, url) {
  const el = card.querySelector('.card-cover');
  if (!el) return;
  const img     = document.createElement('img');
  img.className = 'card-cover';
  img.src       = url;
  img.alt       = '';
  img.loading   = 'lazy';
  el.replaceWith(img);
}

function loadCover(album) {
  if (album.coverUrl) return;
  fetchCover(album.artist, album.title).then(url => {
    if (!url) return;
    collection = updateAlbum(collection, album.id, { coverUrl: url });
    save(collection);
    const card = collectionEl.querySelector(`[data-id="${album.id}"]`);
    if (card) swapCover(card, url);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(album, cardEl) {
  if (document.querySelector('.album-modal')) return;

  const overlay     = document.createElement('div');
  overlay.className = 'modal-overlay';

  const dialog     = document.createElement('dialog');
  dialog.className = 'album-modal';

  // Cover — stays in place while toggling between detail / edit views
  let coverEl;
  if (album.coverUrl) {
    coverEl           = document.createElement('img');
    coverEl.className = 'modal-cover';
    coverEl.src       = album.coverUrl;
    coverEl.alt       = '';
  } else {
    coverEl           = document.createElement('div');
    coverEl.className = 'modal-cover modal-cover--placeholder';
    coverEl.style.setProperty('--ph-bg', placeholderColor(album.artist));
    coverEl.textContent = album.artist.charAt(0).toUpperCase();
  }

  const closeBtn       = document.createElement('button');
  closeBtn.type        = 'button';
  closeBtn.className   = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeModal(dialog, overlay, cardEl));

  // bodyEl tracks whichever body div is currently shown
  let bodyEl;

  // ── Detail view ────────────────────────────────────────────────────────────

  function showDetail(current) {
    const body     = document.createElement('div');
    body.className = 'modal-body';

    const titleEl       = document.createElement('h2');
    titleEl.className   = 'modal-title';
    titleEl.textContent = current.title;

    const artistEl       = document.createElement('div');
    artistEl.className   = 'modal-artist';
    artistEl.textContent = current.artist;

    body.append(titleEl, artistEl);

    if (current.genre) {
      const tags = current.genre.split(',').map(g => g.trim()).filter(Boolean);
      const wrap = document.createElement('div');
      wrap.className = 'genre-tags';
      for (const tag of tags) {
        const badge       = document.createElement('span');
        badge.className   = 'album-genre';
        badge.textContent = tag;
        wrap.append(badge);
      }
      body.append(wrap);
    }

    if (current.songs.length > 0) {
      const ol     = document.createElement('ol');
      ol.className = 'song-list';
      for (const song of current.songs) {
        const li         = document.createElement('li');
        const num        = document.createElement('span');
        num.className    = 'track-num';
        num.textContent  = song.track;
        const name       = document.createElement('span');
        name.textContent = song.title;
        li.append(num, name);
        ol.append(li);
      }
      body.append(ol);
    }

    const actions     = document.createElement('div');
    actions.className = 'modal-actions';

    const editBtn       = document.createElement('button');
    editBtn.type        = 'button';
    editBtn.className   = 'modal-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => showEdit(current));

    const deleteBtn       = document.createElement('button');
    deleteBtn.type        = 'button';
    deleteBtn.className   = 'modal-btn modal-btn--danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      actions.innerHTML = '';
      const msg       = document.createElement('span');
      msg.className   = 'confirm-msg';
      msg.textContent = 'Remove this album?';
      const yesBtn       = document.createElement('button');
      yesBtn.type        = 'button';
      yesBtn.className   = 'confirm-yes';
      yesBtn.textContent = 'Remove';
      yesBtn.addEventListener('click', () => {
        collection = removeAlbum(collection, current.id);
        save(collection);
        renderCollection();
        dismissModal(dialog, overlay);
      });
      const noBtn       = document.createElement('button');
      noBtn.type        = 'button';
      noBtn.className   = 'confirm-no';
      noBtn.textContent = 'Cancel';
      noBtn.addEventListener('click', () => { actions.innerHTML = ''; actions.append(editBtn, deleteBtn); });
      actions.append(msg, yesBtn, noBtn);
    });

    actions.append(editBtn, deleteBtn);
    body.append(actions);

    if (bodyEl) bodyEl.replaceWith(body);
    bodyEl = body;
  }

  // ── Edit view ──────────────────────────────────────────────────────────────

  function showEdit(current) {
    const body      = document.createElement('div');
    body.className  = 'modal-body';

    const editForm      = document.createElement('form');
    editForm.className  = 'edit-form';
    editForm.noValidate = true;

    const songsLabel      = document.createElement('label');
    songsLabel.className  = 'edit-label';
    songsLabel.htmlFor    = 'medit-songs';
    songsLabel.textContent = 'Songs';
    const hint            = document.createElement('span');
    hint.className        = 'hint';
    hint.textContent      = 'One title per line, in track order';
    const songsArea       = document.createElement('textarea');
    songsArea.id          = 'medit-songs';
    songsArea.name        = 'songs';
    songsArea.value       = current.songs.map(s => s.title).join('\n');
    songsLabel.append(hint, songsArea);

    const actions     = document.createElement('div');
    actions.className = 'modal-actions';

    const saveBtn       = document.createElement('button');
    saveBtn.type        = 'submit';
    saveBtn.className   = 'modal-btn modal-btn--primary';
    saveBtn.textContent = 'Save';

    const cancelBtn       = document.createElement('button');
    cancelBtn.type        = 'button';
    cancelBtn.className   = 'modal-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => showDetail(current));

    actions.append(saveBtn, cancelBtn);
    editForm.append(
      makeField('Artist', 'artist', current.artist),
      makeField('Album title', 'title', current.title),
      makeField('Genre', 'genre', current.genre),
      songsLabel,
      actions,
    );

    editForm.addEventListener('submit', e => {
      e.preventDefault();
      const data   = Object.fromEntries(new FormData(editForm));
      const errors = validateAlbum(data);
      if (Object.keys(errors).length > 0) { showErrors(errors, editForm); return; }

      const coverChanged = data.artist.trim() !== current.artist || data.title.trim() !== current.title;
      const updated = {
        ...current,
        artist:   data.artist.trim(),
        title:    data.title.trim(),
        genre:    data.genre?.trim() ?? '',
        songs:    parseSongs(data.songs ?? ''),
        coverUrl: coverChanged ? null : current.coverUrl,
      };

      collection = updateAlbum(collection, updated.id, updated);
      save(collection);

      // Swap the grid card in-place so the close animation targets the right element
      const oldCard = collectionEl.querySelector(`[data-id="${updated.id}"]`);
      const newCard = buildAlbumCard(updated);
      if (oldCard) oldCard.replaceWith(newCard);
      if (coverChanged) loadCover(updated);

      closeModal(dialog, overlay, newCard ?? cardEl);
    });

    body.append(editForm);
    bodyEl.replaceWith(body);
    bodyEl = body;
    body.querySelector('input')?.focus();
  }

  // ── Assemble and open ──────────────────────────────────────────────────────

  showDetail(album);                          // sets bodyEl
  dialog.append(coverEl, bodyEl, closeBtn);  // bodyEl now in DOM
  document.body.append(overlay, dialog);
  dialog.showModal();

  // FLIP: snap to card position, then animate to centre
  const cardRect  = cardEl.getBoundingClientRect();
  const modalRect = dialog.getBoundingClientRect();
  const dx     = (cardRect.left + cardRect.width  / 2) - (modalRect.left + modalRect.width  / 2);
  const dy     = (cardRect.top  + cardRect.height / 2) - (modalRect.top  + modalRect.height / 2);
  const scaleX = cardRect.width  / modalRect.width;
  const scaleY = cardRect.height / modalRect.height;

  dialog.style.transition  = 'none';
  overlay.style.transition = 'none';
  dialog.style.transform   = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scaleX}, ${scaleY})`;
  dialog.style.opacity     = '0';
  overlay.style.opacity    = '0';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    dialog.style.transition  = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';
    overlay.style.transition = 'opacity 0.3s ease';
    dialog.style.transform   = 'translate(-50%, -50%)';
    dialog.style.opacity     = '1';
    overlay.style.opacity    = '1';
  }));

  overlay.addEventListener('click', () => closeModal(dialog, overlay, cardEl));
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeModal(dialog, overlay, cardEl); });
}

function closeModal(dialog, overlay, targetCard) {
  const cardRect  = targetCard.getBoundingClientRect();
  const modalRect = dialog.getBoundingClientRect();
  const dx     = (cardRect.left + cardRect.width  / 2) - (modalRect.left + modalRect.width  / 2);
  const dy     = (cardRect.top  + cardRect.height / 2) - (modalRect.top  + modalRect.height / 2);
  const scaleX = cardRect.width  / modalRect.width;
  const scaleY = cardRect.height / modalRect.height;

  dialog.style.transition  = 'transform 0.3s ease-in, opacity 0.2s ease';
  overlay.style.transition = 'opacity 0.25s ease';
  dialog.style.transform   = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scaleX}, ${scaleY})`;
  dialog.style.opacity     = '0';
  overlay.style.opacity    = '0';

  setTimeout(() => { dialog.close(); dialog.remove(); overlay.remove(); }, 320);
}

function dismissModal(dialog, overlay) {
  dialog.style.transition  = 'opacity 0.2s ease';
  overlay.style.transition = 'opacity 0.2s ease';
  dialog.style.opacity     = '0';
  overlay.style.opacity    = '0';
  setTimeout(() => { dialog.close(); dialog.remove(); overlay.remove(); }, 220);
}

// ── Album card (grid cell) ────────────────────────────────────────────────────

function buildAlbumCard(album) {
  const card      = document.createElement('article');
  card.className  = 'album-card';
  card.dataset.id = album.id;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${album.title} by ${album.artist}`);

  card.append(buildCardCover(album));

  const info      = document.createElement('div');
  info.className  = 'card-info';

  const cardTitle       = document.createElement('div');
  cardTitle.className   = 'card-title';
  cardTitle.textContent = album.title;

  const cardArtist       = document.createElement('div');
  cardArtist.className   = 'card-artist';
  cardArtist.textContent = album.artist;

  info.append(cardTitle, cardArtist);
  card.append(info);

  card.addEventListener('click', () => openModal(album, card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(album, card); }
  });

  return card;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderCollection() {
  const visible = sortByArtist(filterCollection(collection, searchQuery), sortDirection);
  collectionEl.innerHTML = '';
  for (const album of visible) collectionEl.append(buildAlbumCard(album));
}

// ── Add album ─────────────────────────────────────────────────────────────────

form.addEventListener('submit', e => {
  e.preventDefault();
  const data   = Object.fromEntries(new FormData(form));
  const errors = validateAlbum(data);
  if (Object.keys(errors).length > 0) { showErrors(errors); return; }
  clearErrors();
  const album = createAlbum({ ...data, songs: parseSongs(data.songs ?? '') });
  collection  = addAlbum(collection, album);
  save(collection);
  renderCollection();
  form.reset();
  form.elements['artist'].focus();
  loadCover(album);
});

renderCollection();
