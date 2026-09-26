'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { categoryColors } from '../lib/ideas';
import { buildGraph } from '../lib/graph';
import CategoryDot from './category-dot';

const minZoom = 0.1, maxZoom = 5, defaultZoom = 0.86;
const clampZoom = k => Math.min(maxZoom, Math.max(minZoom, k));

// Obsidian-style force-directed graph: drag dots, drag the background to pan, scroll or pinch to zoom,
// click an idea for a link to its page, double-click to open it.
export default function Graph({ ideas, slugs, query }) {
  const router = useRouter();
  const graph = useMemo(() => buildGraph(ideas), [ideas]);
  const colorOf = useMemo(() => categoryColors(ideas), [ideas]);
  const box = useRef(null);
  const canvas = useRef(null);
  const sim = useRef({ nodes: new Map(), links: [], hubs: [], energy: Infinity, view: { x: 0, y: 0, k: defaultZoom }, anim: null, zoomTo: null, coast: null, hover: null, drag: null, size: { w: 0, h: 0 } });
  const draw = useRef(() => {});
  const controls = useRef({});
  const queryRef = useRef(query);
  const openRef = useRef(null);
  const pop = useRef(null);
  const [zoom, setZoom] = useState(defaultZoom);
  const [full, setFull] = useState(false);
  const [picked, setPicked] = useState(null);
  const pickedIdea = picked && ideas.find(x => x.id === picked);
  openRef.current = idea => router.push(`/${slugs.get(idea.id)}`);

  // Rebuild simulation nodes, keeping positions of ideas that already exist.
  useEffect(() => {
    const s = sim.current;
    const old = s.nodes;
    s.nodes = new Map();
    // On first load everything starts piled up in the middle and slowly spreads out. Later, a new idea
    // starts next to its category and a new category near the middle.
    for (const n of graph.nodes) {
      const cluster = n.hub ? n.label : n.idea.category, prev = old.get(n.id);
      const hub = !prev && !n.hub && old.get(`category:${cluster}`), jitter = old.size ? 20 : 60;
      const at = prev || { x: (hub?.x || 0) + (Math.random() - 0.5) * jitter, y: (hub?.y || 0) + (Math.random() - 0.5) * jitter };
      s.nodes.set(n.id, { ...n, cluster, x: at.x, y: at.y, vx: prev?.vx || 0, vy: prev?.vy || 0, degree: 0, glow: prev?.glow, grow: prev?.grow });
    }
    s.links = graph.links.map(l => ({ source: s.nodes.get(l.source), target: s.nodes.get(l.target) }));
    for (const l of s.links) { l.source.degree++; l.target.degree++; }
    for (const n of s.nodes.values()) n.mass = 1 + n.degree * 0.3;
    s.hubs = [...s.nodes.values()].filter(n => n.hub);
    s.colorOf = colorOf;
    s.hover = s.hover && s.nodes.get(s.hover.id);
    s.energy = Infinity;
    draw.current();
  }, [graph, colorOf]);

  useEffect(() => { queryRef.current = query; draw.current(); }, [query]);
  useEffect(() => { sim.current.picked = pickedIdea?.id; draw.current(); }, [pickedIdea]);

  useEffect(() => {
    const s = sim.current, el = canvas.current, ctx = el.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)'), dark = matchMedia('(prefers-color-scheme: dark)');
    const pointers = new Map();
    let frame = 0, shownZoom = defaultZoom;

    // One physics step, modelled on the sitemap graph at vale.rocks: every dot pushes away the dots near it,
    // so none overlap and clusters settle side by side; each idea hangs on a spring from its category, which is
    // heavier the more ideas it holds; a faint pull draws anything far from the middle back in; and speed is
    // capped, so everything moves slowly and calmly. The dragged dot stays under the pointer.
    function tick() {
      const nodes = [...s.nodes.values()], pinned = s.drag?.node;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 1 || d2 > 62500) continue;
          const f = 250 / (d2 * Math.sqrt(d2));
          if (a !== pinned) { a.vx += dx * f / a.mass; a.vy += dy * f / a.mass; }
          if (b !== pinned) { b.vx -= dx * f / b.mass; b.vy -= dy * f / b.mass; }
        }
        if (a !== pinned && a.x * a.x + a.y * a.y > 90000) { a.vx -= a.x * 0.000075 / a.mass; a.vy -= a.y * 0.000075 / a.mass; }
      }
      for (const { source: idea, target: hub } of s.links) {
        const dx = idea.x - hub.x, dy = idea.y - hub.y, d = Math.hypot(dx, dy);
        if (d < 1e-3) continue;
        const f = (d - 100) * 0.0125 / d;
        if (hub !== pinned) { hub.vx += dx * f / hub.mass; hub.vy += dy * f / hub.mass; }
        if (idea !== pinned) { idea.vx -= dx * f / idea.mass; idea.vy -= dy * f / idea.mass; }
      }
      let energy = 0;
      for (const n of nodes) {
        if (n === pinned) { n.vx = n.vy = 0; continue; }
        // Busy categories are damped harder so they don't wobble; speed tops out at 3px a frame.
        const damping = n.degree > 5 ? 0.72 : 0.92;
        n.vx *= damping; n.vy *= damping;
        const speed2 = n.vx * n.vx + n.vy * n.vy;
        if (speed2 > 9) { const scale = 3 / Math.sqrt(speed2); n.vx *= scale; n.vy *= scale; }
        n.x += n.vx; n.y += n.vy;
        energy += speed2;
      }
      s.energy = energy;
    }
    // Runs while dragging and until the motion has died down to an invisible crawl (about 2px a second per dot).
    const restless = () => s.drag?.node || s.energy > 0.001 * Math.max(50, s.nodes.size);

    function stepView(now) {
      const a = s.anim;
      if (a) {
        const t = still.matches ? 1 : Math.min(1, (now - a.start) / 260), e = 1 - (1 - t) ** 3;
        for (const key of ['x', 'y', 'k']) s.view[key] = a.from[key] + (a.to[key] - a.from[key]) * e;
        if (t === 1) s.anim = null;
      }
      // Wheel zoom eases toward its target, keeping the point under the cursor still.
      const z = s.zoomTo;
      if (z) {
        const v = s.view, k = still.matches || Math.abs(z.k - v.k) < 0.001 ? z.k : v.k + (z.k - v.k) * 0.25;
        v.x = z.cx - (z.cx - v.x) * k / v.k; v.y = z.cy - (z.cy - v.y) * k / v.k; v.k = k;
        if (k === z.k) s.zoomTo = null;
      }
      // A flicked pan coasts to a stop.
      const c = s.coast;
      if (c) {
        s.view.x += c.x; s.view.y += c.y; c.x *= 0.92; c.y *= 0.92;
        if (Math.hypot(c.x, c.y) < 0.1) s.coast = null;
      }
    }
    function animateTo(to) { s.zoomTo = s.coast = null; s.anim = { from: { ...s.view }, to, start: performance.now() }; draw.current(); }

    function matches(n) {
      const q = queryRef.current.trim().toLowerCase();
      return !q || n.hub || `${n.idea.title} ${n.idea.body} ${n.idea.category}`.toLowerCase().includes(q);
    }

    // Draws a frame; returns whether hover fades are still animating.
    function paint() {
      const { w, h } = s.size, { x, y, k } = s.view, dpr = devicePixelRatio || 1;
      // Colors come from the stylesheet tokens so the graph follows light and dark mode.
      const css = getComputedStyle(el), token = v => css.getPropertyValue(v).trim();
      const [ink, muted, faint, bg] = ['--ink', '--muted', '--border', '--canvas'].map(token);
      const hue = new Map(), color = n => {
        const name = s.colorOf(n.hub ? n.label : n.idea.category);
        if (!hue.has(name)) hue.set(name, token(name));
        return hue.get(name);
      };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + x, h / 2 + y);
      ctx.scale(k, k);
      const focus = s.hover, pickedNode = s.picked && s.nodes.get(s.picked), near = new Set(focus ? [focus] : []);
      if (focus) for (const l of s.links) if (l.source === focus || l.target === focus) { near.add(l.source); near.add(l.target); }
      const nodes = [...s.nodes.values()];

      // Ease each dot's brightness and size toward where hover and search want them.
      let fading = false;
      const ease = (value, target) => {
        if (value === undefined || still.matches || Math.abs(target - value) < 0.01) return target;
        fading = true;
        return value + (target - value) * 0.22;
      };
      for (const n of nodes) {
        n.glow = ease(n.glow, (!focus || near.has(n)) && matches(n) ? 1 : 0.15);
        n.grow = ease(n.grow, n === focus ? 1.35 : 1);
      }

      // Spokes join ideas to their category.
      for (const l of s.links) {
        const on = [focus, pickedNode].some(n => n && (l.source === n || l.target === n));
        ctx.globalAlpha = on ? 1 : 0.55 * Math.min(l.source.glow, l.target.glow);
        ctx.strokeStyle = on ? muted : faint;
        ctx.lineWidth = (on ? 1.5 : 1) / k;
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      }
      for (const n of nodes) {
        const r = radius(n) * n.grow, c = color(n);
        ctx.globalAlpha = n.glow;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (n.idea?.resting) { ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1.5 / k; ctx.stroke(); }
        else { ctx.fillStyle = c; ctx.fill(); }
        if (n === focus || n === pickedNode) { ctx.beginPath(); ctx.arc(n.x, n.y, r + 3 / k, 0, Math.PI * 2); ctx.strokeStyle = ink; ctx.lineWidth = 1.5 / k; ctx.stroke(); }
      }
      // Only categories are labeled, drawn over their dots. They grow when you zoom in but never shrink below
      // 12px on screen, so they stay readable when the whole graph is in view. A label that would run into
      // another label is skipped.
      const scale = 1 / Math.min(k, 1), taken = [];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = font(scale);
      for (const n of s.hubs) {
        const box = labelBox(n, scale);
        if (taken.some(t => t.x0 < box.x1 && box.x0 < t.x1 && t.y0 < box.y1 && box.y0 < t.y1)) continue;
        taken.push(box);
        ctx.globalAlpha = n.glow;
        ctx.fillStyle = ink;
        ctx.fillText(shortLabel(n.label), n.x, box.y0 + 1 * scale);
      }
      // Idea titles stay hidden; the one under the cursor shows its title in a readable tag.
      if (focus?.idea) {
        const size = 12 / k, pad = 6 / k, top = focus.y + radius(focus) * focus.grow + 6 / k, text = shortLabel(focus.label);
        ctx.globalAlpha = 1;
        ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
        const w = ctx.measureText(text).width;
        ctx.beginPath(); ctx.roundRect(focus.x - w / 2 - pad, top, w + pad * 2, size + pad * 1.4, 4 / k);
        ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = faint; ctx.lineWidth = 1 / k; ctx.stroke();
        ctx.fillStyle = ink; ctx.fillText(text, focus.x, top + pad * 0.7);
      }
      ctx.globalAlpha = 1;
      if (Math.round(k * 100) !== Math.round(shownZoom * 100)) { shownZoom = k; setZoom(k); }
      // Keep the picked idea's card pinned above its dot (below it near the top edge).
      const card = pop.current;
      if (card && pickedNode) {
        const px = w / 2 + x + pickedNode.x * k, py = h / 2 + y + pickedNode.y * k;
        card.style.transform = `translate(${px}px, ${py}px)`;
        card.classList.toggle('below', py < 170);
        card.style.setProperty('--below', `${(radius(pickedNode) + 24) * k + 6}px`);
        card.style.visibility = 'visible';
      }
      return fading;
    }

    function loop(now) {
      frame = 0;
      stepView(now);
      if (still.matches) for (let i = 0; i < 3000 && restless(); i++) tick();
      else if (restless()) tick();
      const moving = !still.matches && restless();
      // When motion ends, nudge apart any dots still touching; this only removes a leftover pixel or two.
      if (!moving && s.wasMoving !== false) {
        for (let i = 0; i < 50 && separate([...s.nodes.values()]); i++);
      }
      s.wasMoving = moving;
      const fading = paint();
      if (s.anim || s.zoomTo || s.coast || moving || fading) frame = requestAnimationFrame(loop);
    }
    draw.current = () => { if (!frame) frame = requestAnimationFrame(loop); };

    // Zoom around the canvas center.
    controls.current.zoom = factor => {
      const v = s.anim?.to || s.view, k = clampZoom(v.k * factor);
      animateTo({ x: v.x * k / v.k, y: v.y * k / v.k, k });
    };
    controls.current.reset = () => {
      const v = s.anim?.to || s.view;
      animateTo({ x: v.x / v.k * defaultZoom, y: v.y / v.k * defaultZoom, k: defaultZoom });
    };
    // Frame every node, e.g. after panning off into empty space.
    controls.current.fit = () => {
      const nodes = [...s.nodes.values()];
      if (!nodes.length) return;
      const boxes = nodes.map(n => { const r = radius(n); return { x0: n.x - r - 12, x1: n.x + r + 12, y0: n.y - r - 6, y1: n.y + r + 22 }; });
      const [x0, x1, y0, y1] = [Math.min(...boxes.map(b => b.x0)), Math.max(...boxes.map(b => b.x1)), Math.min(...boxes.map(b => b.y0)), Math.max(...boxes.map(b => b.y1))];
      const k = clampZoom(Math.min(2, (s.size.w - 48) / (x1 - x0), (s.size.h - 96) / (y1 - y0)));
      animateTo({ x: -(x0 + x1) / 2 * k, y: -(y0 + y1) / 2 * k, k });
    };

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect, dpr = devicePixelRatio || 1;
      s.size = { w: width, h: height };
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      draw.current();
    });
    resize.observe(box.current);

    // Screen point relative to the canvas center, and the world point under it.
    const local = e => { const rect = el.getBoundingClientRect(); return { x: e.clientX - rect.left - s.size.w / 2, y: e.clientY - rect.top - s.size.h / 2 }; };
    const world = e => { const p = local(e); return { x: (p.x - s.view.x) / s.view.k, y: (p.y - s.view.y) / s.view.k }; };
    const hit = p => {
      let best = null, bestD = Infinity;
      for (const n of s.nodes.values()) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < Math.max(radius(n) + 4, 10 / s.view.k) && d < bestD) { best = n; bestD = d; }
      }
      return best;
    };
    function startPinch() {
      const [a, b] = [...pointers.values()];
      s.drag = null;
      s.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...s.view } };
    }
    function down(e) {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      s.anim = s.zoomTo = s.coast = null;
      if (pointers.size === 2) return startPinch();
      if (pointers.size > 2) return;
      const node = hit(world(e));
      s.drag = { node, start: { x: e.clientX, y: e.clientY }, view: { ...s.view }, moved: false, last: { x: e.clientX, y: e.clientY, t: e.timeStamp }, speed: { x: 0, y: 0 } };
      if (node) { s.grab = { x: world(e).x - node.x, y: world(e).y - node.y }; el.style.cursor = 'grabbing'; }
    }
    function move(e) {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, local(e));
      // Two fingers: pinch to zoom around their midpoint, and move them to pan.
      if (s.pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()], p = s.pinch, v = s.view;
        const k = clampZoom(p.view.k * Math.hypot(a.x - b.x, a.y - b.y) / p.dist), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        v.k = k; v.x = mid.x - (p.mid.x - p.view.x) * k / p.view.k; v.y = mid.y - (p.mid.y - p.view.y) * k / p.view.k;
        return draw.current();
      }
      const d = s.drag;
      if (!d) {
        const node = hit(world(e));
        if (node !== s.hover) { s.hover = node; el.style.cursor = node ? 'pointer' : 'grab'; draw.current(); }
        return;
      }
      if (Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > 3) d.moved = true;
      if (d.node) {
        // The dragged dot follows the pointer; the rest of the graph reacts through the physics.
        const p = world(e);
        d.node.x = p.x - s.grab.x; d.node.y = p.y - s.grab.y;
      } else if (d.moved) {
        s.view.x = d.view.x + e.clientX - d.start.x; s.view.y = d.view.y + e.clientY - d.start.y;
        el.style.cursor = 'grabbing';
        // Remember how fast the pan is moving, for coasting after release.
        const dt = Math.max(1, e.timeStamp - d.last.t);
        d.speed = { x: 0.6 * d.speed.x + 0.4 * (e.clientX - d.last.x) * 16 / dt, y: 0.6 * d.speed.y + 0.4 * (e.clientY - d.last.y) * 16 / dt };
        d.last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      }
      draw.current();
    }
    function up(e) {
      pointers.delete(e.pointerId);
      if (s.pinch) { if (pointers.size < 2) s.pinch = null; return; }
      const d = s.drag;
      s.drag = null;
      el.style.cursor = s.hover ? 'pointer' : 'grab';
      if (!d) return;
      if (!d.moved) setPicked(d.node?.idea ? d.node.idea.id : null);
      else if (!d.node && !still.matches && e.timeStamp - d.last.t < 80 && Math.hypot(d.speed.x, d.speed.y) > 1) s.coast = { ...d.speed };
      draw.current();
    }
    function leave() { if (!s.drag && s.hover) { s.hover = null; draw.current(); } }
    function wheel(e) {
      e.preventDefault();
      s.anim = s.coast = null;
      // Trackpad pinches arrive as wheel events with ctrlKey and small deltas.
      const target = clampZoom((s.zoomTo?.k ?? s.view.k) * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)));
      const p = local(e);
      s.zoomTo = { k: target, cx: p.x, cy: p.y };
      draw.current();
    }
    function dblclick(e) {
      const node = hit(world(e));
      if (node?.idea) openRef.current(node.idea);
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('dblclick', dblclick);
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
      el.removeEventListener('dblclick', dblclick);
      dark.removeEventListener('change', repaint);
    };
  }, []);

  // Real fullscreen where the browser supports it (not iPhone Safari), otherwise a fixed overlay.
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === box.current);
    const escape = e => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      setPicked(null);
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('fullscreenchange', sync); document.removeEventListener('keydown', escape); };
  }, []);
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (full) setFull(false);
    else if (box.current.requestFullscreen) box.current.requestFullscreen().catch(() => setFull(true));
    else setFull(true);
  }

  const percent = Math.round(zoom * 100), clusters = graph.nodes.filter(n => n.hub).length;
  return <div className="graph">
    <div ref={box} className={`graph-canvas ${full ? 'full' : ''}`}>
      <canvas ref={canvas} aria-label={`Graph of ${ideas.length} ideas in ${clusters} categories`} role="img" />
      {pickedIdea && <div ref={pop} key={pickedIdea.id} className="graph-pop" style={{ visibility: 'hidden' }}>
        <div className="graph-pop-card">
          <div className="graph-pop-meta"><CategoryDot color={colorOf(pickedIdea.category)} />{pickedIdea.category}{pickedIdea.resting && ' · Resting'}</div>
          <Link className="graph-pop-title" href={`/${slugs.get(pickedIdea.id)}`}>{pickedIdea.title} <span aria-hidden="true">→</span></Link>
          {pickedIdea.body && <p>{preview(pickedIdea.body)}</p>}
        </div>
      </div>}
      <div className="graph-controls top">
        <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen (Esc)' : 'Full screen'}>{full ? <Icon d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /> : <Icon d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />}</button>
      </div>
      <div className="graph-controls bottom">
        <button type="button" onClick={() => controls.current.zoom(1.25)} disabled={percent >= maxZoom * 100} aria-label="Zoom in" title="Zoom in"><Icon d="M12 5v14M5 12h14" /></button>
        <button type="button" className="graph-zoom" onClick={() => controls.current.reset()} aria-label={`Zoom ${percent}%, reset to ${defaultZoom * 100}%`} title={`Reset to ${defaultZoom * 100}%`}>{percent}%</button>
        <button type="button" onClick={() => controls.current.zoom(1 / 1.25)} disabled={percent <= minZoom * 100} aria-label="Zoom out" title="Zoom out"><Icon d="M5 12h14" /></button>
        <span className="graph-divider" aria-hidden="true" />
        <button type="button" onClick={() => controls.current.fit()} aria-label="Fit graph to view" title="Fit graph to view"><Icon d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6" /></button>
      </div>
    </div>
    <p className="graph-hint">Ideas gather around their category. Drag dots or the background, scroll or pinch to zoom, click a dot for its link, double-click to open it. Hollow dots are resting.</p>
    <nav className="graph-keys" aria-label="Ideas in the graph">{ideas.map(idea => <Link key={idea.id} href={`/${slugs.get(idea.id)}`}>{idea.title}</Link>)}</nav>
  </div>;
}

function preview(body) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}

function Icon({ d }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

// Dots grow with their connections, so categories grow with their ideas.
function radius(n) { return 4 + Math.log1p(n.degree) * 3.5; }
function font(scale = 1) { return `600 ${12 * scale}px ui-sans-serif, system-ui, sans-serif`; }
function shortLabel(label) { return label.length > 32 ? `${label.slice(0, 31)}…` : label; }

let measurer;
// World-space box of a category label drawn under its dot, `scale` times the normal 12px size.
function labelBox(n, scale) {
  if (n.labelWidth === undefined) {
    measurer ||= document.createElement('canvas').getContext('2d');
    measurer.font = font();
    n.labelWidth = measurer.measureText(shortLabel(n.label)).width;
  }
  const top = n.y + radius(n) * (n.grow || 1) + 3, half = n.labelWidth * scale / 2 + 3 * scale;
  return { x0: n.x - half, x1: n.x + half, y0: top, y1: top + 16 * scale };
}

// Push touching dots apart by exactly their overlap. Returns whether anything moved.
function separate(nodes) {
  let moved = false;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j], min = radius(a) + radius(b) + 2;
    const dx = b.x - a.x || 0.01, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= min) continue;
    const push = (min - d + 0.01) / d / 2;
    a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
    moved = true;
  }
  return moved;
}
