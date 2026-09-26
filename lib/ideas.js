export const storageKey = 'unfinished.ideas.v1';
// Built-in categories; people can also file ideas under their own.
export const categories = ['A thought', 'Someday', 'A question', 'An experiment'];
export const maxCategoryLength = 40;
const colorCount = 8;
export const examples = [
  ['A bookshop that only opens when it rains', 'No schedule. Just a light in the window, a kettle on, and a reason to hope for bad weather.', 'Someday'],
  ['What if we collected questions instead?', 'A notebook with no answers. Just better and better questions.', 'A question'],
  ['A map of the places I’ve felt at home', 'Not necessarily places I’ve lived. The corner table. That stretch of coastline. Someone’s kitchen.', 'A thought'],
  ['Make something deliberately slow', 'A website that grows one leaf a day. Nothing to optimize. Nothing to catch up on.', 'An experiment'],
  ['Dinner with a different decade', 'One recipe, one record, one story. A small way to spend an evening somewhere else.', 'Someday'],
  ['Where do the little ideas go?', 'The ones that arrive on a walk and disappear before you get home. Maybe they just need somewhere to land.', 'A question'],
].map(([title, body, category], i) => ({ id: `sample-${i}`, title, body, category, created: '2026-01-01T00:00:00.000Z', resting: false, sample: true }));

export function validIdea(x) {
  return Boolean(x && typeof x.id === 'string' && typeof x.title === 'string' && x.title.trim() && x.title.length <= 140 && typeof x.body === 'string' && x.body.length <= 12000 && typeof x.category === 'string' && x.category.trim() && x.category.length <= maxCategoryLength && typeof x.resting === 'boolean' && typeof x.created === 'string' && Number.isFinite(Date.parse(x.created)));
}
export function mergeBackup(ideas, data) {
  if (data?.version !== 1 || !Array.isArray(data.ideas) || !data.ideas.every(validIdea)) throw new Error('Invalid backup');
  const ids = new Set(ideas.map(x => x.id));
  const added = [];
  for (const x of data.ideas) {
    if (!ids.has(x.id)) {
      added.push({ id: x.id, title: x.title, body: x.body, category: x.category, created: x.created, resting: x.resting });
      ids.add(x.id);
    }
  }
  return { ideas: [...added, ...ideas], added: added.length };
}

// Paths the app already uses, so an idea titled "Opengraph image" can't shadow them.
const reservedSlugs = new Set(['icon-svg', 'opengraph-image', 'twitter-image']);
export function slugify(title) {
  const slug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '') || 'idea';
  return reservedSlugs.has(slug) ? `${slug}-idea` : slug;
}
// A unique URL slug per idea id. The oldest idea keeps the plain slug; later duplicates get -2, -3…
export function slugsFor(ideas) {
  const slugs = new Map(), used = new Set();
  for (const idea of [...ideas].sort(oldestFirst)) {
    const base = slugify(idea.title);
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    slugs.set(idea.id, slug);
  }
  return slugs;
}

function oldestFirst(a, b) { return a.created.localeCompare(b.created) || a.id.localeCompare(b.id); }

// Built-in categories first, then custom ones in the order they were first used. Names match case-insensitively.
export function categoryList(ideas) {
  const list = [...categories], seen = new Set(list.map(c => c.toLowerCase()));
  for (const idea of [...ideas].sort(oldestFirst)) {
    const key = idea.category.toLowerCase();
    if (!seen.has(key)) { seen.add(key); list.push(idea.category); }
  }
  return list;
}
// Returns category -> CSS color token. Built-ins keep their colors; custom categories take the next ones, repeating after eight.
export function categoryColors(ideas) {
  const tokens = new Map(categoryList(ideas).map((c, i) => [c.toLowerCase(), `--category-${i % colorCount + 1}`]));
  return category => tokens.get(category.toLowerCase()) || '--muted';
}
