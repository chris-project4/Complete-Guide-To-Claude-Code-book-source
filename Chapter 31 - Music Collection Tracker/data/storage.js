const KEY = 'music-collection';

export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
