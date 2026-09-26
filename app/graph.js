'use client';

import { useEffect, useMemo, useRef } from 'react';
import { buildGraph } from '../lib/graph';

// Obsidian-style force-directed graph: drag nodes, drag the background to pan, scroll to zoom, click an idea to open it.
export default function Graph({ ideas, query, onOpen }) {
  const graph = useMemo(() => buildGraph(ideas), [ideas]);
  const box = useRef(null);
  const canvas = useRef(null);
  const sim = useRef({ nodes: new Map(), links: [], alpha: 1, view: { x: 0, y: 0, k: 1 }, hover: null, drag: null, size: { w: 0, h: 0 } });
  const draw = useRef(() => {});
  const queryRef = useRef(query);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  // Rebuild simulation nodes, keeping positions of ideas that already exist.
  useEffect(() => {
    const s = sim.current;
    const old = s.nodes;
    s.nodes = new Map();
    for (const n of graph.nodes) {
      const prev = old.get(n.id);
      const angle = Math.random() * Math.PI * 2, r = 60 + Math.random() * 140;
      s.nodes.set(n.id, { ...n, x: prev?.x ?? Math.cos(angle) * r, y: prev?.y ?? Math.sin(angle) * r, vx: 0, vy: 0, degree: 0 });
    }
    s.links = graph.links.map(l => ({ ...l, source: s.nodes.get(l.source), target: s.nodes.get(l.target) }));
    for (const l of s.links) { l.source.degree++; l.target.degree++; }
    s.hover = s.hover && s.nodes.get(s.hover.id);
    s.alpha = old.size ? 0.5 : 1;
    draw.current(true);
  }, [graph]);

  useEffect(() => { queryRef.current = query; draw.current(); }, [query]);

  useEffect(() => {
    const s = sim.current, el = canvas.current, ctx = el.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)'), dark = matchMedia('(prefers-color-scheme: dark)');
    let frame = 0;

    function tick() {
      const nodes = [...s.nodes.values()];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        if (d2 > 250000) continue;
        const f = (a.hub || b.hub ? 360 : 180) * s.alpha / d2;
        a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
      for (const { source: a, target: b, hub } of s.links) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const f = (d - (hub ? 100 : 70)) / d * (hub ? 0.06 : 0.12) * s.alpha;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      for (const n of nodes) {
        if (n === s.drag?.node) { n.vx = n.vy = 0; continue; }
        n.vx = (n.vx - n.x * 0.01 * s.alpha) * 0.6;
        n.vy = (n.vy - n.y * 0.01 * s.alpha) * 0.6;
        n.x += n.vx; n.y += n.vy;
      }
      s.alpha *= 0.985;
    }

    function matches(n) {
      const q = queryRef.current.trim().toLowerCase();
      return !q || n.hub || `${n.idea.title} ${n.idea.body} ${n.idea.category}`.toLowerCase().includes(q);
    }

    function paint() {
      const { w, h } = s.size, { x, y, k } = s.view, dpr = devicePixelRatio || 1;
      // Colors come from the stylesheet tokens so the graph follows light and dark mode.
      const css = getComputedStyle(el), [ink, muted, faint, soft, bg] = ['--ink', '--muted', '--border', '--soft', '--canvas'].map(v => css.getPropertyValue(v).trim());
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + x, h / 2 + y);
      ctx.scale(k, k);
      const focus = s.hover, near = new Set(focus ? [focus] : []);
      if (focus) for (const l of s.links) if (l.source === focus || l.target === focus) { near.add(l.source); near.add(l.target); }
      const lit = n => (!focus || near.has(n)) && matches(n);

      for (const l of s.links) {
        const on = focus && (l.source === focus || l.target === focus);
        ctx.globalAlpha = on ? 1 : lit(l.source) && lit(l.target) ? 1 : 0.15;
        ctx.strokeStyle = on ? muted : faint;
        ctx.lineWidth = (on ? 1.5 : 1) / k;
        if (l.hub) ctx.setLineDash([3 / k, 3 / k]);
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
        ctx.setLineDash([]);
      }
      const labelFade = Math.min(1, Math.max(0, (k - 0.55) / 0.35));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const n of s.nodes.values()) {
        const r = radius(n), on = lit(n);
        ctx.globalAlpha = on ? 1 : 0.15;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (n.idea?.resting) { ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = muted; ctx.lineWidth = 1.5 / k; ctx.stroke(); }
        else { ctx.fillStyle = n === focus || n.hub ? ink : muted; ctx.fill(); }
        const show = n.hub || (focus ? near.has(n) : labelFade);
        if (!show) continue;
        ctx.globalAlpha = on ? (focus || n.hub ? 1 : labelFade) : 0.15;
        ctx.fillStyle = n.hub ? ink : soft;
        ctx.font = `${n.hub ? 600 : 400} ${12 / k}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText(n.label.length > 32 ? `${n.label.slice(0, 31)}…` : n.label, n.x, n.y + r + 4 / k);
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      frame = 0;
      if (still.matches) while (s.alpha > 0.005) tick();
      else if (s.alpha > 0.005 || s.drag?.node) tick();
      paint();
      if (!still.matches && (s.alpha > 0.005 || s.drag?.node)) frame = requestAnimationFrame(loop);
    }
    draw.current = reheat => {
      if (reheat) s.alpha = Math.max(s.alpha, 0.3);
      if (!frame) frame = requestAnimationFrame(loop);
    };

    const resize = new ResizeObserver(() => {
      const { width, height } = box.current.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      s.size = { w: width, h: height };
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      draw.current();
    });
    resize.observe(box.current);

    const world = e => {
      const rect = el.getBoundingClientRect();
      return { x: (e.clientX - rect.left - s.size.w / 2 - s.view.x) / s.view.k, y: (e.clientY - rect.top - s.size.h / 2 - s.view.y) / s.view.k };
    };
    const hit = p => {
      let best = null, bestD = Infinity;
      for (const n of s.nodes.values()) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < Math.max(radius(n) + 4, 10 / s.view.k) && d < bestD) { best = n; bestD = d; }
      }
      return best;
    };
    function down(e) {
      const p = world(e), node = hit(p);
      el.setPointerCapture(e.pointerId);
      s.drag = { node, start: { x: e.clientX, y: e.clientY }, view: { ...s.view }, moved: false };
      if (node) draw.current(true);
    }
    function move(e) {
      const d = s.drag;
      if (!d) {
        const node = hit(world(e));
        if (node !== s.hover) { s.hover = node; el.style.cursor = node ? 'pointer' : 'grab'; draw.current(); }
        return;
      }
      if (Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > 3) d.moved = true;
      if (d.node) { const p = world(e); d.node.x = p.x; d.node.y = p.y; s.alpha = Math.max(s.alpha, 0.3); }
      else { s.view.x = d.view.x + e.clientX - d.start.x; s.view.y = d.view.y + e.clientY - d.start.y; el.style.cursor = 'grabbing'; }
      draw.current();
    }
    function up() {
      const d = s.drag;
      s.drag = null;
      el.style.cursor = s.hover ? 'pointer' : 'grab';
      if (d && !d.moved && d.node?.idea) openRef.current(d.node.idea);
      draw.current();
    }
    function leave() { if (!s.drag && s.hover) { s.hover = null; draw.current(); } }
    function wheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect(), v = s.view;
      const k = Math.min(4, Math.max(0.25, v.k * Math.exp(-e.deltaY * 0.0015)));
      const cx = e.clientX - rect.left - s.size.w / 2, cy = e.clientY - rect.top - s.size.h / 2;
      v.x = cx - (cx - v.x) * k / v.k; v.y = cy - (cy - v.y) * k / v.k; v.k = k;
      draw.current();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });
    const repaint = () => draw.current();
    dark.addEventListener('change', repaint);
    draw.current();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
      dark.removeEventListener('change', repaint);
    };
  }, []);

  const wikilinks = graph.links.filter(l => !l.hub).length;
  return <div className="graph">
    <div ref={box} className="graph-canvas"><canvas ref={canvas} aria-label={`Graph of ${ideas.length} ideas and ${wikilinks} links`} role="img" /></div>
    <p className="graph-hint">Link ideas by writing <code>[[Another idea]]</code> in notes. Drag to move, scroll to zoom, click to open. Hollow dots are resting.</p>
    <nav className="graph-keys" aria-label="Ideas in the graph">{ideas.map(idea => <button key={idea.id} type="button" onClick={() => onOpen(idea)}>{idea.title}</button>)}</nav>
  </div>;
}

function radius(n) { return n.hub ? 7 : 4 + Math.min(6, Math.sqrt(n.degree - 1) * 1.8); }
