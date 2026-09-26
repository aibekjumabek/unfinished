'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { categoryColors, examples, slugsFor } from '../../lib/ideas';
import CategoryDot from '../category-dot';
import { Editor, Toast } from '../editor';
import { useIdeas } from '../use-ideas';

const exampleSlugs = slugsFor(examples);

// Read-only page for one idea, found by its title slug. Ideas live in this browser, so it resolves on the client.
export default function IdeaPage() {
  const params = useParams();
  const router = useRouter();
  const { ideas, ready, persist, notify, toast } = useIdeas();
  const [editing, setEditing] = useState(false);
  const slug = decode(params.slug);
  const slugs = useMemo(() => slugsFor(ideas), [ideas]);
  const saved = ideas.find(x => slugs.get(x.id) === slug);
  const idea = saved || examples.find(x => exampleSlugs.get(x.id) === slug);
  const pool = saved ? ideas : examples;
  const colorOf = useMemo(() => categoryColors(pool), [pool]);

  useEffect(() => { document.title = idea ? `${idea.title} · Unfinished` : 'Unfinished'; }, [idea]);

  function done(result) {
    setEditing(false);
    if (result?.deleted) { notify('Idea deleted.', { carry: true }); router.push('/'); }
    else if (result?.saved) {
      const next = slugsFor(result.ideas).get(result.saved.id);
      if (next !== slug) router.replace(`/${next}`);
    }
  }

  if (!ready) return <div className="shell"><p className="description">Loading…</p></div>;
  if (!idea) return <div className="shell idea-page">
    <nav className="idea-nav"><Link href="/" className="back">← All ideas</Link></nav>
    <div className="empty"><h2>This idea isn’t here.</h2><p>It may have been renamed or deleted, or saved in another browser.</p><Link className="button" href="/">Back to your ideas</Link></div>
  </div>;

  const date = new Date(idea.created).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return <>
    <div className="shell idea-page">
      <nav className="idea-nav"><Link href="/" className="back">← All ideas</Link><button className="button" onClick={() => setEditing(true)}>{idea.sample ? 'Save this idea' : 'Edit'}</button></nav>
      <main><article>
        <div className="idea-meta"><CategoryDot color={colorOf(idea.category)} />{idea.category}<span aria-hidden="true">·</span>{idea.sample ? 'Example' : `Left here ${date}`}{idea.resting && <span className="badge">Resting</span>}</div>
        <h1 className="idea-title">{idea.title}</h1>
        {idea.body ? <p className="idea-body">{idea.body}</p> : <p className="idea-body empty-body">No notes yet.</p>}
      </article></main>
    </div>
    {editing && <Editor idea={idea} ideas={ideas} persist={persist} notify={notify} onDone={done} />}
    <Toast message={toast} />
  </>;
}

function decode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}
