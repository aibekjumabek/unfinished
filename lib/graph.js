import { categories } from './ideas.js';

const wikilink = /\[\[([^\[\]|]+)(?:\|[^\[\]]*)?\]\]/g;

// Titles referenced as [[Title]] or [[Title|alias]] in an idea's notes.
export function linkedTitles(body) {
  return [...body.matchAll(wikilink)].map(m => m[1].trim()).filter(Boolean);
}

// Ideas become nodes; each category is a hub node. Edges come from category membership and [[wikilinks]] (matched by title, case-insensitive).
export function buildGraph(ideas) {
  const nodes = [];
  const links = [];
  const seen = new Set();
  const byTitle = new Map();
  for (const idea of ideas) {
    const key = idea.title.trim().toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, idea.id);
  }
  for (const category of categories) {
    if (ideas.some(x => x.category === category)) nodes.push({ id: `category:${category}`, label: category, hub: true });
  }
  for (const idea of ideas) {
    nodes.push({ id: idea.id, label: idea.title, idea });
    links.push({ source: idea.id, target: `category:${idea.category}`, hub: true });
    for (const title of linkedTitles(idea.body)) {
      const target = byTitle.get(title.toLowerCase());
      const pair = [idea.id, target].sort().join('\n');
      if (target && target !== idea.id && !seen.has(pair)) {
        seen.add(pair);
        links.push({ source: idea.id, target });
      }
    }
  }
  return { nodes, links };
}
