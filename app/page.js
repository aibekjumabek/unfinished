'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { examples, mergeBackup, slugsFor, storageKey, validIdea } from '../lib/ideas';
import { Editor, Toast } from './editor';
import Graph from './graph';
import { useIdeas } from './use-ideas';

const viewKey = 'unfinished.view';
const views = ['shelf', 'resting', 'graph'];

export default function Home() {
  const router = useRouter();
  const { ideas, ready, persist, notify, toast } = useIdeas();
  const [view, setView] = useState('shelf');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const importInput = useRef(null);
  const lastRediscovered = useRef(null);
  const pool = ideas.length ? ideas : examples;
  const slugs = useMemo(() => slugsFor(pool), [pool]);

  // Return to the tab you left, e.g. the graph after reading an idea.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(viewKey);
      if (views.includes(saved)) setView(saved);
    } catch {}
  }, []);
  function chooseView(tab) {
    setView(tab);
    try { sessionStorage.setItem(viewKey, tab); } catch {}
  }

  function rediscover() {
    const others = ideas.filter(x => x.id !== lastRediscovered.current);
    const candidates = others.length ? others : ideas;
    if (!candidates.length) return;
    const idea = candidates[Math.floor(Math.random() * candidates.length)];
    lastRediscovered.current = idea.id;
    router.push(`/${slugs.get(idea.id)}`);
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
  const graphing = view === 'graph';
  const tabLabels = { shelf: ['On the shelf', shelfCount], resting: ['Resting', ideas.length - shelfCount], graph: ['Graph'] };

  return <>
    <div className="shell">
      <header><h1>Unfinished</h1><button className="button primary" id="new-idea" disabled={!ready} onClick={() => setCreating(true)}>＋ New idea</button></header>
      <main><p className="description">A place for ideas you’re not ready to finish.</p>
        <section className="shelf" aria-label="Your ideas" aria-busy={!ready}>
          <div className="toolbar">
            <div className="tabs" role="group" aria-label="Idea shelf">
              {Object.entries(tabLabels).map(([tab, [label, count]]) => <button key={tab} className={`tab ${view === tab ? 'active' : ''}`} data-view={tab} aria-pressed={view === tab} onClick={() => chooseView(tab)}>{label}{count !== undefined && <> <span>{count}</span></>}</button>)}
            </div>
            <div className="tools"><label className="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Find a thought…" aria-label="Search ideas" value={search} onChange={e => setSearch(e.target.value)} /></label><button id="rediscover" className="button rediscover" disabled={!ideas.length} onClick={rediscover} title="Open a random saved idea, including resting ideas"><span aria-hidden="true">↝</span> Rediscover</button></div>
          </div>
          {graphing ? ready && <><div className="shelf-caption"><span>{ideas.length ? 'Every idea from both shelves, grouped by category.' : 'Example ideas. Save one or add your own.'}</span></div><Graph ideas={pool} slugs={slugs} query={search} /></> : <>
          <div className="shelf-caption"><span>{!ready ? 'Loading your ideas…' : samples ? 'Example ideas. Save one or add your own.' : view === 'resting' ? 'Ideas set aside for later.' : 'Your saved ideas.'}</span><span id="idea-count">{ready && (samples ? '6 example ideas' : `${shown.length} ${shown.length === 1 ? 'idea' : 'ideas'}`)}</span></div>
          <div id="cards" className="cards">{shown.map(idea => <Link key={idea.id} href={`/${slugs.get(idea.id)}`} className="card" data-category={idea.category}>
            <div className="card-category">{idea.category}{idea.sample && <span className="sample">EXAMPLE</span>}</div>
            <h2>{idea.title}</h2><p>{idea.body}</p><div className="card-foot"><span>{idea.sample ? 'Example · click to read' : `Left here ${new Date(idea.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</span><span className="arrow" aria-hidden="true">↗</span></div>
          </Link>)}</div>
          {ready && !shown.length && <div id="empty" className="empty"><h2>{query ? 'No thoughts found here.' : view === 'resting' ? 'Nothing resting just yet.' : 'A little room for possibility.'}</h2><p>{query ? 'Try another word or look on the other shelf.' : view === 'resting' ? 'Let an idea rest when you want to set it aside.' : 'Your ideas can start with a single sentence.'}</p>{!query && view === 'shelf' && <button className="button" onClick={() => setCreating(true)}>Leave your first idea ↗</button>}</div>}
          </>}
        </section>
      </main>
      <footer><span>Built by <a href="https://vibecorp.xyz" target="_blank" rel="noreferrer">VibeCorp ↗</a></span><div><span className="local-note">Saved on this device</span><button id="export" disabled={!ready} onClick={exportIdeas}>Export</button><button id="import" disabled={!ready} onClick={() => importInput.current.click()}>Import</button><input ref={importInput} type="file" id="import-file" accept="application/json,.json" hidden onChange={importIdeas} /></div></footer>
    </div>
    {creating && <Editor idea={null} ideas={ideas} persist={persist} notify={notify} onDone={() => setCreating(false)} />}
    <Toast message={toast} />
  </>;
}
