const REQUIRED = ['artist', 'title'];

export function validateAlbum(input) {
  const errors = {};
  for (const field of REQUIRED) {
    if (!input[field] || !String(input[field]).trim()) {
      errors[field] = 'required';
    }
  }
  return errors;
}

export function createAlbum(input) {
  return {
    id:       crypto.randomUUID(),
    artist:   String(input.artist).trim(),
    title:    String(input.title).trim(),
    genre:    input.genre ? String(input.genre).trim() : '',
    songs:    Array.isArray(input.songs)
                ? [...input.songs].sort((a, b) => a.track - b.track)
                : [],
    coverUrl: null,
    addedAt:  new Date().toISOString(),
  };
}

export function updateAlbum(list, id, changes) {
  return list.map(album => album.id === id ? { ...album, ...changes } : album);
}

export function addAlbum(list, album) {
  return [...list, album];
}

export function removeAlbum(list, id) {
  return list.filter(album => album.id !== id);
}

export function filterCollection(list, query) {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(a =>
    a.artist.toLowerCase().includes(q) ||
    a.title.toLowerCase().includes(q)  ||
    a.genre.toLowerCase().includes(q)
  );
}

export function sortByArtist(list, direction) {
  return [...list].sort((a, b) => {
    const cmp = a.artist.localeCompare(b.artist);
    return direction === 'asc' ? cmp : -cmp;
  });
}
