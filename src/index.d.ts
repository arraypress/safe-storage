/**
 * @arraypress/safe-storage — TypeScript definitions.
 */

/** `'local'` is `localStorage` (kept), `'session'` is `sessionStorage` (this tab). */
export type StorageArea = 'local' | 'session';

/**
 * A stored value, or null when there's none (or storage is off).
 */
export function readStored(area: StorageArea, key: string): string | null;

/**
 * Store a value, or (with null) forget it. Does nothing when storage is
 * off or full.
 */
export function writeStored(area: StorageArea, key: string, value: string | null): void;

/**
 * A stored JSON value, or null when there's none, it isn't JSON, or
 * storage is off. The type parameter is a promise you make, not a check.
 */
export function readStoredJson<T = unknown>(area: StorageArea, key: string): T | null;

/**
 * Store a value as JSON, or (with null) forget it. A value JSON can't
 * write (`undefined`, a function, a cycle, a BigInt) writes nothing.
 */
export function writeStoredJson<T = unknown>(area: StorageArea, key: string, value: T | null): void;

/**
 * Whether an area can be written to now (a value is stored and removed
 * to find out). False when storage is off, missing, or full.
 */
export function isStorageAvailable(area: StorageArea): boolean;
