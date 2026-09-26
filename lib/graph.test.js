import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from './graph.js';
const idea = (id, title, body = '', category = 'A thought') => ({ id, title, body, category, created: '2026-09-25T12:00:00.000Z', resting: false });

test('adds a hub for each used category and links each idea only to its own', () => {
  const { nodes, links } = buildGraph([idea('a', 'One', 'See [[Two]]'), idea('b', 'Two', '', 'Someday')]);
  assert.deepEqual(nodes.filter(x => x.hub).map(x => x.id), ['category:A thought', 'category:Someday']);
  assert.deepEqual(links, [{ source: 'a', target: 'category:A thought' }, { source: 'b', target: 'category:Someday' }]);
});
test('makes a hub for custom categories, after the built-ins', () => {
  const { nodes } = buildGraph([idea('a', 'One', '', 'Recipes'), idea('b', 'Two', '', 'Someday')]);
  assert.deepEqual(nodes.filter(x => x.hub).map(x => x.label), ['Someday', 'Recipes']);
});
