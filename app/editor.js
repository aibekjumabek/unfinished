'use client';

import { useEffect, useRef, useState } from 'react';
import { categories, categoryList, maxCategoryLength } from '../lib/ideas';

// Select value for the "New category" option; a control character, so no typed name can match it.
const newCategory = '\u0000new';

// The idea editor dialog, mounted open. `idea` is null for a new idea; an example saves as a new idea.
// onDone gets { saved, ideas } after a save or rest toggle, { deleted: true } after a delete, and nothing when closed.
export function Editor({ idea, ideas, persist, notify, onDone }) {
  const dialog = useRef(null);
  const titleInput = useRef(null);
  const categoryInput = useRef(null);
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState({ title: idea?.title || '', body: idea?.body || '', category: idea?.category || categories[0] });
  const current = ideas.find(x => x.id === idea?.id);
  const existing = categoryList(ideas);
  const options = existing.some(c => c.toLowerCase() === draft.category.toLowerCase()) || adding ? existing : [...existing, draft.category];

  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
    titleInput.current.focus();
  }, []);

  function save(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) { titleInput.current.setCustomValidity('Give this idea a few words.'); titleInput.current.reportValidity(); return; }
    // A new category matching an existing one in any case joins it, so "someday" files under "Someday".
    const typed = draft.category.trim().replace(/\s+/g, ' ');
    if (!typed) { categoryInput.current.setCustomValidity('Name the new category.'); categoryInput.current.reportValidity(); return; }
    const category = existing.find(c => c.toLowerCase() === typed.toLowerCase()) || typed;
    const saved = { id: current?.id || crypto.randomUUID(), title, body: draft.body.trim(), category, created: current?.created || new Date().toISOString(), resting: current?.resting || false };
    const next = current ? ideas.map(x => x.id === current.id ? saved : x) : [saved, ...ideas];
    if (persist(next)) { notify(current ? 'Changes saved.' : 'Idea saved.'); onDone({ saved, ideas: next }); }
  }
  function toggleRest() {
    const saved = { ...current, resting: !current.resting }, next = ideas.map(x => x.id === current.id ? saved : x);
    if (persist(next)) { notify(current.resting ? 'Back on the shelf.' : 'Moved to resting.'); onDone({ saved, ideas: next }); }
  }
  function remove() {
    if (confirm('Delete this idea permanently? Export a backup first if you want to keep it.') && persist(ideas.filter(x => x.id !== current.id))) onDone({ deleted: true });
  }

  return <dialog id="editor" ref={dialog} aria-labelledby="editor-label" onClose={() => onDone()}><form id="idea-form" onSubmit={save}>
    <div className="dialog-top"><span className="eyebrow" id="editor-label">{idea?.sample ? 'SAVE EXAMPLE' : current ? 'EDIT IDEA' : 'NEW IDEA'}</span><button type="button" className="icon-button" id="close" aria-label="Close editor" onClick={() => dialog.current.close()}>×</button></div>
    <label className="sr-only" htmlFor="title">Idea title</label><input ref={titleInput} id="title" className="title-input" placeholder="Idea title" maxLength={140} required value={draft.title} onChange={e => { e.target.setCustomValidity(''); setDraft({ ...draft, title: e.target.value }); }} />
    <label className="sr-only" htmlFor="body">Notes</label><textarea id="body" placeholder="Notes, questions, or anything to come back to." maxLength={12000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
    <div className="form-bottom"><div className="category-label"><label htmlFor="category">Filed under</label>{adding !== null
      ? <span className="new-category"><input ref={categoryInput} id="category" placeholder="New category" maxLength={maxCategoryLength} autoFocus value={draft.category} onChange={e => { e.target.setCustomValidity(''); setDraft({ ...draft, category: e.target.value }); }} /><button type="button" className="icon-button" aria-label="Choose an existing category" title="Choose an existing category" onClick={() => { setDraft({ ...draft, category: adding }); setAdding(null); }}>×</button></span>
      : <select id="category" value={draft.category} onChange={e => { if (e.target.value === newCategory) { setAdding(draft.category); setDraft({ ...draft, category: '' }); } else setDraft({ ...draft, category: e.target.value }); }}>{options.map(category => <option key={category}>{category}</option>)}<option value={newCategory}>＋ New category…</option></select>}</div><button className="button primary" type="submit">{current ? 'Save changes' : 'Save idea'}</button></div>
    {current && <div id="edit-actions" className="edit-actions"><button type="button" id="rest" onClick={toggleRest}>{current.resting ? 'Bring back to shelf' : 'Let it rest'}</button><button type="button" id="delete" onClick={remove}>Delete idea</button></div>}
  </form></dialog>;
}

export function Toast({ message }) {
  return <div id="toast" className={message ? 'visible' : ''} role="status" aria-live="polite">{message}</div>;
}
