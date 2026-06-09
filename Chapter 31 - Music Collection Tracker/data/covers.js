const API_BASE = 'https://itunes.apple.com/search';

export async function fetchCover(artist, album) {
  const params = new URLSearchParams({
    term:   `${artist} ${album}`,
    media:  'music',
    entity: 'album',
    limit:  '5',
  });
  try {
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const results = json.results ?? [];
    // Prefer a result whose title or artist matches, fall back to first result
    const match = results.find(r =>
      r.collectionName?.toLowerCase().includes(album.toLowerCase()) ||
      r.artistName?.toLowerCase().includes(artist.toLowerCase())
    ) ?? results[0];
    if (!match?.artworkUrl100) return null;
    // Swap the size token for a larger image
    return match.artworkUrl100.replace('100x100bb', '600x600bb');
  } catch {
    return null;
  }
}
