export const storageKey = 'unfinished.ideas.v1';
export const categories = ['A thought', 'Someday', 'A question', 'An experiment'];
export const examples = [
  ['A bookshop that only opens when it rains', 'No schedule. Just a light in the window, a kettle on, and a reason to hope for bad weather.', 'Someday'],
  ['What if we collected questions instead?', 'A notebook with no answers. Just better and better questions.', 'A question'],
  ['A map of the places I’ve felt at home', 'Not necessarily places I’ve lived. The corner table. That stretch of coastline. Someone’s kitchen.', 'A thought'],
  ['Make something deliberately slow', 'A website that grows one leaf a day. Nothing to optimize. Nothing to catch up on.', 'An experiment'],
  ['Dinner with a different decade', 'One recipe, one record, one story. A small way to spend an evening somewhere else.', 'Someday'],
  ['Where do the little ideas go?', 'The ones that arrive on a walk and disappear before you get home. Maybe they just need somewhere to land.', 'A question'],
].map(([title, body, category], i) => ({ id: `sample-${i}`, title, body, category, created: '2026-01-01T00:00:00.000Z', resting: false, sample: true }));

export function validIdea(x) {
  return Boolean(x && typeof x.id === 'string' && typeof x.title === 'string' && x.title.trim() && x.title.length <= 140 && typeof x.body === 'string' && x.body.length <= 12000 && categories.includes(x.category) && typeof x.resting === 'boolean' && typeof x.created === 'string' && Number.isFinite(Date.parse(x.created)));
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
