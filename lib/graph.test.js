import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, linkedTitles } from './graph.js';
const idea = (id, title, body = '', category = 'A thought') => ({ id, title, body, category, created: '2026-09-25T12:00:00.000Z', resting: false });

test('reads [[wikilinks]] and aliases from notes', () => {
  assert.deepEqual(linkedTitles('See [[Rain shop]] and [[ Slow web | the slow one]]. Not [[]] or [single].'), ['Rain shop', 'Slow web']);
});
test('links ideas by title, case-insensitively, once per pair', () => {
  const { links } = buildGraph([idea('a', 'Rain shop', 'Like [[slow web]] and [[Slow Web]]'), idea('b', 'Slow web', 'Back to [[Rain shop]]'), idea('c', 'Alone', '[[Missing]] [[Alone]]')]);
  assert.deepEqual(links.filter(x => !x.hub), [{ source: 'a', target: 'b' }]);
});
test('adds a hub for each used category', () => {
  const { nodes, links } = buildGraph([idea('a', 'One'), idea('b', 'Two', '', 'Someday')]);
  assert.deepEqual(nodes.filter(x => x.hub).map(x => x.id), ['category:A thought', 'category:Someday']);
  assert.deepEqual(links.filter(x => x.hub).map(x => x.target), ['category:A thought', 'category:Someday']);
});
