import { categoryList } from './ideas.js';

// Ideas become nodes, and each category in use becomes a hub node that its ideas link to.
export function buildGraph(ideas) {
  const order = categoryList(ideas).map(c => c.toLowerCase());
  const used = [...new Set(ideas.map(x => x.category))].sort((a, b) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase()));
  const nodes = used.map(category => ({ id: `category:${category}`, label: category, hub: true }));
  const links = [];
  for (const idea of ideas) {
    nodes.push({ id: idea.id, label: idea.title, idea });
    links.push({ source: idea.id, target: `category:${idea.category}` });
  }
  return { nodes, links };
}
