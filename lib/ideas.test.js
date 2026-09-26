import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryColors, categoryList, mergeBackup, slugify, slugsFor, validIdea, storageKey } from './ideas.js';
const idea = { id: 'old-id', title: 'An existing idea', body: 'Saved before migration', category: 'A thought', created: '2026-09-25T12:00:00.000Z', resting: true };
test('preserves the existing storage format and key', () => {
  assert.equal(storageKey, 'unfinished.ideas.v1');
  assert.equal(validIdea(idea), true);
  assert.deepEqual(mergeBackup([], { version: 1, ideas: [idea] }).ideas, [idea]);
});
test('import keeps existing edits and deduplicates incoming IDs', () => {
  const added = { ...idea, id: 'new-id' };
  const result = mergeBackup([idea], { version: 1, ideas: [{ ...idea, title: 'Older revision' }, added, added] });
  assert.equal(result.added, 1);
  assert.deepEqual(result.ideas, [added, idea]);
});
test('rejects malformed backups without replacing data', () => {
  for (const data of [null, { version: 2, ideas: [] }, { version: 1, ideas: [{ ...idea, created: 'bad-date' }] }, { version: 1, ideas: [{ ...idea, title: ' ' }] }]) {
    assert.throws(() => mergeBackup([idea], data));
  }
});
test('makes readable, unique URL slugs', () => {
  const at = (id, title, created) => ({ ...idea, id, title, created });
  assert.equal(slugify('A bookshop that only opens when it rains!'), 'a-bookshop-that-only-opens-when-it-rains');
  assert.equal(slugify('Қала картасы — идея'), 'қала-картасы-идея');
  assert.equal(slugify('???'), 'idea');
  assert.equal(slugify('Opengraph image'), 'opengraph-image-idea');
  const slugs = slugsFor([at('b', 'Rain shop', '2026-09-02T00:00:00.000Z'), at('a', 'Rain Shop', '2026-09-01T00:00:00.000Z'), at('c', 'Rain shop 2', '2026-09-03T00:00:00.000Z')]);
  assert.deepEqual([...slugs].sort(), [['a', 'rain-shop'], ['b', 'rain-shop-2'], ['c', 'rain-shop-2-2']]);
});
test('accepts custom categories and colors them after the built-ins', () => {
  assert.equal(validIdea({ ...idea, category: 'Recipes' }), true);
  assert.equal(validIdea({ ...idea, category: ' ' }), false);
  assert.equal(validIdea({ ...idea, category: 'x'.repeat(41) }), false);
  const ideas = [{ ...idea, id: 'b', category: 'Travel', created: '2026-09-02T00:00:00.000Z' }, { ...idea, id: 'a', category: 'Recipes', created: '2026-09-01T00:00:00.000Z' }, { ...idea, id: 'c', category: 'recipes' }];
  assert.deepEqual(categoryList(ideas), ['A thought', 'Someday', 'A question', 'An experiment', 'Recipes', 'Travel']);
  const color = categoryColors(ideas);
  assert.deepEqual(['Someday', 'Recipes', 'RECIPES', 'Travel', 'Unknown'].map(color), ['--category-2', '--category-5', '--category-5', '--category-6', '--muted']);
});
