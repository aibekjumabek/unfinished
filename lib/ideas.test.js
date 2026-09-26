import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeBackup, validIdea, storageKey } from './ideas.js';
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
