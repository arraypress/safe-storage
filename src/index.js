/**
 * @arraypress/safe-storage
 *
 * The browser's storage, for what a page remembers (a theme, a session,
 * a table's settings). Storage can be off (a private window, blocked
 * site data), and then even touching `localStorage` throws: here,
 * reading gives null and writing does nothing, so the page carries on
 * without it. A full quota is the same: the write is dropped, not thrown.
 *
 * Zero dependencies. Safe to import anywhere; where there's no storage
 * at all (Node, a Worker) every read is null and every write a no-op.
 *
 * @module @arraypress/safe-storage
 */

/** @typedef {'local' | 'session'} StorageArea `localStorage` (kept), or `sessionStorage` (this tab). */

/** The key `isStorageAvailable` writes and removes to test an area. */
const PROBE_KEY = '__arraypress_safe_storage__';

/**
 * The storage itself. Throws when it's off.
 *
 * @param {StorageArea} area Which.
 * @returns {Storage} It.
 */
const storage = (area) => (area === 'session' ? globalThis.sessionStorage : globalThis.localStorage);

/**
 * A stored value.
 *
 * @param {StorageArea} area Where.
 * @param {string} key Its name.
 * @returns {string | null} The value, or null when there's none (or storage is off).
 */
export function readStored(area, key) {
  try {
    return storage(area).getItem(key);
  } catch {
    return null;
  }
}

/**
 * Store a value, or (with null) forget it. Does nothing when storage is
 * off or full.
 *
 * @param {StorageArea} area Where.
 * @param {string} key Its name.
 * @param {string | null} value The value; null removes it.
 */
export function writeStored(area, key, value) {
  try {
    if (value === null) storage(area).removeItem(key);
    else storage(area).setItem(key, value);
  } catch {
    // Storage off or full: kept for this page only, if at all.
  }
}

/**
 * A stored JSON value.
 *
 * @template [T=unknown]
 * @param {StorageArea} area Where.
 * @param {string} key Its name.
 * @returns {T | null} The parsed value, or null when there's none (or it isn't JSON).
 */
export function readStoredJson(area, key) {
  const text = readStored(area, key);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Store a value as JSON, or (with null) forget it. A value JSON can't
 * write (`undefined`, a function, a cycle, a BigInt) writes nothing and
 * leaves what was there.
 *
 * @param {StorageArea} area Where.
 * @param {string} key Its name.
 * @param {unknown} value The value; null removes it.
 */
export function writeStoredJson(area, key, value) {
  if (value === null) {
    writeStored(area, key, null);
    return;
  }
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    return;
  }
  if (typeof text === 'string') writeStored(area, key, text);
}

/**
 * Whether an area can be written to now: a value is stored and removed
 * to find out. False when storage is off, missing, or full.
 *
 * @param {StorageArea} area Which.
 * @returns {boolean} Whether writes will stick.
 */
export function isStorageAvailable(area) {
  try {
    const store = storage(area);
    store.setItem(PROBE_KEY, PROBE_KEY);
    store.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}
