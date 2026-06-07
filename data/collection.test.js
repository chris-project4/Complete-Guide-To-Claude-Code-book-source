import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlbum, addAlbum, removeAlbum, validateAlbum } from './collection.js';

const VALID = { artist: 'Portishead', title: 'Dummy', genre: 'Trip-hop' };

// createAlbum

test('createAlbum assigns a string id', () => {
  const album = createAlbum(VALID);
  assert.equal(typeof album.id, 'string');
  assert.ok(album.id.length > 0);
});

test('createAlbum sets addedAt to an ISO timestamp', () => {
  const before = Date.now();
  const album = createAlbum(VALID);
  const ts = new Date(album.addedAt).getTime();
  assert.ok(ts >= before && ts <= Date.now());
});

test('createAlbum trims whitespace from artist and title', () => {
  const album = createAlbum({ artist: '  Boards of Canada  ', title: '  Music Has the Right to Children  ' });
  assert.equal(album.artist, 'Boards of Canada');
  assert.equal(album.title, 'Music Has the Right to Children');
});

test('createAlbum defaults genre to empty string when omitted', () => {
  const album = createAlbum({ artist: 'Talk Talk', title: 'Spirit of Eden' });
  assert.equal(album.genre, '');
});

test('createAlbum defaults songs to empty array when omitted', () => {
  const album = createAlbum(VALID);
  assert.deepEqual(album.songs, []);
});

test('createAlbum sorts songs by track number', () => {
  const album = createAlbum({
    ...VALID,
    songs: [{ track: 3, title: 'Roads' }, { track: 1, title: 'Mysterons' }, { track: 2, title: 'Sour Times' }],
  });
  assert.deepEqual(
    album.songs.map(s => s.track),
    [1, 2, 3],
  );
});

test('createAlbum does not mutate the input songs array', () => {
  const songs = [{ track: 2, title: 'B' }, { track: 1, title: 'A' }];
  const original = [...songs];
  createAlbum({ ...VALID, songs });
  assert.deepEqual(songs, original);
});

// addAlbum

test('addAlbum returns a new array containing the album', () => {
  const list = [];
  const album = createAlbum(VALID);
  const next = addAlbum(list, album);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, album.id);
});

test('addAlbum does not mutate the input list', () => {
  const list = [createAlbum(VALID)];
  const album = createAlbum({ artist: 'Massive Attack', title: 'Mezzanine' });
  addAlbum(list, album);
  assert.equal(list.length, 1);
});

// removeAlbum

test('removeAlbum returns a new array without the target id', () => {
  const a = createAlbum(VALID);
  const b = createAlbum({ artist: 'Massive Attack', title: 'Mezzanine' });
  const list = [a, b];
  const next = removeAlbum(list, a.id);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, b.id);
});

test('removeAlbum does not mutate the input list', () => {
  const a = createAlbum(VALID);
  const list = [a];
  removeAlbum(list, a.id);
  assert.equal(list.length, 1);
});

test('removeAlbum with unknown id returns the list unchanged', () => {
  const a = createAlbum(VALID);
  const list = [a];
  const next = removeAlbum(list, 'no-such-id');
  assert.equal(next.length, 1);
});

// validateAlbum

test('validateAlbum returns empty object for valid input', () => {
  assert.deepEqual(validateAlbum(VALID), {});
});

test('validateAlbum flags missing artist', () => {
  const errors = validateAlbum({ title: 'Dummy' });
  assert.equal(errors.artist, 'required');
  assert.equal(errors.title, undefined);
});

test('validateAlbum flags missing title', () => {
  const errors = validateAlbum({ artist: 'Portishead' });
  assert.equal(errors.title, 'required');
  assert.equal(errors.artist, undefined);
});

test('validateAlbum flags both fields when both are missing', () => {
  const errors = validateAlbum({});
  assert.equal(errors.artist, 'required');
  assert.equal(errors.title, 'required');
});

test('validateAlbum treats whitespace-only strings as missing', () => {
  const errors = validateAlbum({ artist: '   ', title: '   ' });
  assert.equal(errors.artist, 'required');
  assert.equal(errors.title, 'required');
});
