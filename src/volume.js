/**
 * Single source of truth for the user's master volume. Persisted to
 * localStorage so the setting survives reloads. All audio in the
 * scene (Pokédex SFX, voice lines, click sounds) multiplies its
 * per-clip base volume by this master.
 *
 * Range: 0 .. 1
 */
const STORAGE_KEY = 'portfolio-master-volume';
const DEFAULT_VOLUME = 0.5;

let master = readStored();
const listeners = new Set();

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return DEFAULT_VOLUME;
    const n = parseFloat(v);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  } catch (_) {}
  return DEFAULT_VOLUME;
}

export function getMaster() {
  return master;
}

export function setMaster(v) {
  master = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(STORAGE_KEY, String(master)); } catch (_) {}
  for (const fn of listeners) fn(master);
}

export function onMasterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
