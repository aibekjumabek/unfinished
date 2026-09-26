'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { storageKey, validIdea } from '../lib/ideas';

const flashKey = 'unfinished.flash';

// Ideas saved in this browser, kept in sync across tabs, plus a toast message for feedback.
export function useIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  // `carry` holds the message for the next page, for actions that navigate away (like deleting).
  const notify = useCallback((message, { carry = false } = {}) => {
    if (carry) {
      try { sessionStorage.setItem(flashKey, message); return; } catch {}
    }
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3500);
  }, []);

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
    try {
      const flash = sessionStorage.getItem(flashKey);
      if (flash) { sessionStorage.removeItem(flashKey); notify(flash); }
    } catch {}
    const sync = event => { if (event.key === storageKey || event.key === null) load(); };
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('storage', sync); clearTimeout(timer.current); };
  }, [notify]);

  function persist(next) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setIdeas(next); return true; }
    catch { notify('Could not save. Storage may be full or unavailable. Export a backup.'); return false; }
  }

  return { ideas, ready, persist, notify, toast };
}
