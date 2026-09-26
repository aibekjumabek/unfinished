'use client';

import { useEffect, useRef, useState } from 'react';
import { categories, examples, mergeBackup, storageKey, validIdea } from '../lib/ideas';

export default function Home() {
  const [ideas, setIdeas] = useState([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('shelf');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(null);
  const [editorLabel, setEditorLabel] = useState('NEW IDEA');
  const [toast, setToast] = useState('');
  const dialog = useRef(null);
  const titleInput = useRef(null);
  const importInput = useRef(null);
  const timer = useRef(null);
  const lastRediscovered = useRef(null);

  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    function load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!Array.isArray(parsed) || !parsed.every(validIdea)) throw new Error();
        setIdeas(parsed);
      } catch { setToast('Could not read saved ideas. Import a backup or try reloading.'); }
      setReady(true);
    }
    load();
    const sync = event => { if (event.key === storageKey || event.key === null) load(); };
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('storage', sync); clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (draft && !dialog.current.open) {
      dialog.current.showModal();
      titleInput.current.focus();
    }
  }, [draft]);

  function persist(next) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setIdeas(next); return true; }
    catch { notify('Could not save. Storage may be full or unavailable. Export a backup.'); return false; }
  }
  function openEditor(idea = null, rediscovered = false) {
    setDraft({ id: idea?.sample ? null : idea?.id, title: idea?.title || '', body: idea?.body || '', category: idea?.category || categories[0] });
    setEditorLabel(rediscovered ? 'REDISCOVERED IDEA' : idea?.sample ? 'SAVE EXAMPLE' : idea ? 'EDIT IDEA' : 'NEW IDEA');
  }
  function closeEditor() { dialog.current.close(); setDraft(null); }
  function save(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) { titleInput.current.setCustomValidity('Give this idea a few words.'); titleInput.current.reportValidity(); return; }
    const old = ideas.find(x => x.id === draft.id);
    const idea = { id: old?.id || crypto.randomUUID(), title, body: draft.body.trim(), category: draft.category, created: old?.created || new Date().toISOString(), resting: old?.resting || false };
    if (persist(old ? ideas.map(x => x.id === old.id ? idea : x) : [idea, ...ideas])) {
      closeEditor(); notify(old ? 'Changes saved.' : 'Idea saved.');
    }
  }
  function toggleRest() {
    const old = ideas.find(x => x.id === draft.id);
    if (old && persist(ideas.map(x => x.id === old.id ? { ...x, resting: !x.resting } : x))) {
      closeEditor(); notify(old.resting ? 'Back on the shelf.' : 'Moved to resting.');
    }
  }
  function remove() {
    if (confirm('Delete this idea permanently? Export a backup first if you want to keep it.') && persist(ideas.filter(x => x.id !== draft.id))) {
      closeEditor(); notify('Idea deleted.');
    }
  }
  function rediscover() {
    const pool = ideas.filter(x => x.id !== lastRediscovered.current);
    const candidates = pool.length ? pool : ideas;
    if (!candidates.length) return;
    const idea = candidates[Math.floor(Math.random() * candidates.length)];
    lastRediscovered.current = idea.id;
    openEditor(idea, true);
  }
  function exportIdeas() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, ideas }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `unfinished-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup exported.');
  }
  async function importIdeas(event) {
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error();
      const data = JSON.parse(await file.text());
      // Merge against storage after reading the file to preserve edits from other tabs.
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(current) || !current.every(validIdea)) throw new Error();
      const result = mergeBackup(current, data);
      if (persist(result.ideas)) notify(`Imported ${result.added} ${result.added === 1 ? 'idea' : 'ideas'}. Existing ideas kept.`);
    } catch { notify('That backup could not be read. Choose an Unfinished JSON export.'); }
    input.value = '';
  }

  const query = search.trim().toLowerCase();
  const shelfCount = ideas.filter(x => !x.resting).length;
  const samples = ready && ideas.length === 0 && view === 'shelf' && !query;
  const shown = (samples ? examples : ideas).filter(x => x.resting === (view === 'resting') && `${x.title} ${x.body} ${x.category}`.toLowerCase().includes(query));
  const current = ideas.find(x => x.id === draft?.id);

  return <>
    <div className="shell">
      <header><h1>Unfinished</h1><button className="button primary" id="new-idea" disabled={!ready} onClick={() => openEditor()}>＋ New idea</button></header>
      <main><p className="description">A place for ideas you’re not ready to finish.</p>
        <section className="shelf" aria-label="Your ideas" aria-busy={!ready}>
          <div className="toolbar">
            <div className="tabs" role="group" aria-label="Idea shelf">
              {['shelf', 'resting'].map(tab => <button key={tab} className={`tab ${view === tab ? 'active' : ''}`} data-view={tab} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab === 'shelf' ? 'On the shelf' : 'Resting'} <span>{tab === 'shelf' ? shelfCount : ideas.length - shelfCount}</span></button>)}
            </div>
            <div className="tools"><label className="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Find a thought…" aria-label="Search ideas" value={search} onChange={e => setSearch(e.target.value)} /></label><button id="rediscover" className="button rediscover" disabled={!ideas.length} onClick={rediscover} title="Open a random saved idea, including resting ideas"><span aria-hidden="true">↝</span> Rediscover</button></div>
          </div>
          <div className="shelf-caption"><span>{!ready ? 'Loading your ideas…' : samples ? 'Example ideas. Save one or add your own.' : view === 'resting' ? 'Ideas set aside for later.' : 'Your saved ideas.'}</span><span id="idea-count">{ready && (samples ? '6 example ideas' : `${shown.length} ${shown.length === 1 ? 'idea' : 'ideas'}`)}</span></div>
          <div id="cards" className="cards">{shown.map(idea => <button key={idea.id} type="button" className="card" data-category={idea.category} onClick={() => openEditor(idea)}>
            <div className="card-category">{idea.category}{idea.sample && <span className="sample">EXAMPLE</span>}</div>
            <h2>{idea.title}</h2><p>{idea.body}</p><div className="card-foot"><span>{idea.sample ? 'Example · click to edit' : `Left here ${new Date(idea.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</span><span className="arrow" aria-hidden="true">↗</span></div>
          </button>)}</div>
          {ready && !shown.length && <div id="empty" className="empty"><h2>{query ? 'No thoughts found here.' : view === 'resting' ? 'Nothing resting just yet.' : 'A little room for possibility.'}</h2><p>{query ? 'Try another word or look on the other shelf.' : view === 'resting' ? 'Let an idea rest when you want to set it aside.' : 'Your ideas can start with a single sentence.'}</p>{!query && view === 'shelf' && <button className="button" onClick={() => openEditor()}>Leave your first idea ↗</button>}</div>}
        </section>
      </main>
      <footer><span>Built by <a href="https://vibecorp.xyz" target="_blank" rel="noreferrer">VibeCorp ↗</a></span><div><span className="local-note">Saved on this device</span><button id="export" disabled={!ready} onClick={exportIdeas}>Export</button><button id="import" disabled={!ready} onClick={() => importInput.current.click()}>Import</button><input ref={importInput} type="file" id="import-file" accept="application/json,.json" hidden onChange={importIdeas} /></div></footer>
    </div>
    <dialog id="editor" ref={dialog} aria-labelledby="editor-label" onClose={() => setDraft(null)}>{draft && <form id="idea-form" onSubmit={save}>
      <div className="dialog-top"><span className="eyebrow" id="editor-label">{editorLabel}</span><button type="button" className="icon-button" id="close" aria-label="Close editor" onClick={closeEditor}>×</button></div>
      <label className="sr-only" htmlFor="title">Idea title</label><input ref={titleInput} id="title" className="title-input" placeholder="Idea title" maxLength={140} required value={draft.title} onChange={e => { e.target.setCustomValidity(''); setDraft({ ...draft, title: e.target.value }); }} />
      <label className="sr-only" htmlFor="body">Notes</label><textarea id="body" placeholder="Notes, questions, or anything to come back to." maxLength={12000} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
      <div className="form-bottom"><label className="category-label">Filed under<select id="category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><button className="button primary" type="submit">{current ? 'Save changes' : 'Save idea'}</button></div>
      {current && <div id="edit-actions" className="edit-actions"><button type="button" id="rest" onClick={toggleRest}>{current.resting ? 'Bring back to shelf' : 'Let it rest'}</button><button type="button" id="delete" onClick={remove}>Delete idea</button></div>}
    </form>}</dialog>
    <div id="toast" className={toast ? 'visible' : ''} role="status" aria-live="polite">{toast}</div>
  </>;
}
