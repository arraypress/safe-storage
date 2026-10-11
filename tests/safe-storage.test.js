import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  readStored,
  writeStored,
  readStoredJson,
  writeStoredJson,
  isStorageAvailable,
} from '../src/index.js';

// ── Stubs ───────────────────────────────────

/** A Map-backed Storage, like the browser's. */
function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

/** Storage that's full: reads and removes work, every set throws. */
function fullStorage() {
  const store = memoryStorage();
  store.setItem = () => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
  return store;
}

const originals = {
  localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
  sessionStorage: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'),
};

/** Put `value` at `globalThis[name]`. */
function install(name, value) {
  Object.defineProperty(globalThis, name, { configurable: true, get: () => value });
}

/** Make touching `globalThis[name]` throw, as a private window does. */
function installOff(name) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

after(() => {
  for (const [name, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});

// ── Working storage ─────────────────────────

describe('with storage on', () => {
  let local;
  let session;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
    install('localStorage', local);
    install('sessionStorage', session);
  });

  it('reads null for a missing key', () => {
    assert.equal(readStored('local', 'theme'), null);
    assert.equal(readStored('session', 'theme'), null);
  });

  it('writes and reads a string', () => {
    writeStored('local', 'theme', 'dark');
    assert.equal(readStored('local', 'theme'), 'dark');
    assert.equal(local.map.get('theme'), 'dark');
  });

  it('keeps the areas apart', () => {
    writeStored('local', 'k', 'kept');
    writeStored('session', 'k', 'this tab');
    assert.equal(readStored('local', 'k'), 'kept');
    assert.equal(readStored('session', 'k'), 'this tab');
    assert.equal(session.map.get('k'), 'this tab');
  });

  it('null removes', () => {
    writeStored('local', 'theme', 'dark');
    writeStored('local', 'theme', null);
    assert.equal(readStored('local', 'theme'), null);
    assert.equal(local.map.has('theme'), false);
  });

  it('an empty string is a value, not a removal', () => {
    writeStored('local', 'note', '');
    assert.equal(readStored('local', 'note'), '');
  });

  it('JSON round-trips', () => {
    const settings = { columns: ['name', 'total'], perPage: 25, dense: true };
    writeStoredJson('local', 'table', settings);
    assert.deepEqual(readStoredJson('local', 'table'), settings);
    assert.equal(local.map.get('table'), JSON.stringify(settings));

    writeStoredJson('session', 'count', 0);
    assert.equal(readStoredJson('session', 'count'), 0);
    writeStoredJson('session', 'flag', false);
    assert.equal(readStoredJson('session', 'flag'), false);
    writeStoredJson('session', 'text', 'hi');
    assert.equal(readStoredJson('session', 'text'), 'hi');
  });

  it('JSON null removes', () => {
    writeStoredJson('local', 'table', { a: 1 });
    writeStoredJson('local', 'table', null);
    assert.equal(local.map.has('table'), false);
    assert.equal(readStoredJson('local', 'table'), null);
  });

  it('JSON reads null for missing or bad JSON', () => {
    assert.equal(readStoredJson('local', 'missing'), null);
    writeStored('local', 'bad', '{not json');
    assert.equal(readStoredJson('local', 'bad'), null);
    writeStored('local', 'empty', '');
    assert.equal(readStoredJson('local', 'empty'), null);
  });

  it('a value JSON cannot write writes nothing and keeps what was there', () => {
    writeStoredJson('local', 'k', { kept: true });
    const cycle = {};
    cycle.self = cycle;
    assert.doesNotThrow(() => writeStoredJson('local', 'k', cycle));
    assert.doesNotThrow(() => writeStoredJson('local', 'k', 10n));
    assert.doesNotThrow(() => writeStoredJson('local', 'k', undefined));
    assert.doesNotThrow(() => writeStoredJson('local', 'k', () => {}));
    assert.deepEqual(readStoredJson('local', 'k'), { kept: true });
  });

  it('is available, and leaves no probe behind', () => {
    assert.equal(isStorageAvailable('local'), true);
    assert.equal(isStorageAvailable('session'), true);
    assert.equal(local.length, 0);
    assert.equal(session.length, 0);
  });
});

// ── Storage off ─────────────────────────────

describe('with storage off (touching it throws)', () => {
  beforeEach(() => {
    installOff('localStorage');
    installOff('sessionStorage');
  });

  it('the stub really throws', () => {
    assert.throws(() => globalThis.localStorage);
  });

  it('reads give null', () => {
    assert.equal(readStored('local', 'theme'), null);
    assert.equal(readStored('session', 'theme'), null);
    assert.equal(readStoredJson('local', 'table'), null);
  });

  it('writes do not throw', () => {
    assert.doesNotThrow(() => writeStored('local', 'theme', 'dark'));
    assert.doesNotThrow(() => writeStored('session', 'theme', null));
    assert.doesNotThrow(() => writeStoredJson('local', 'table', { a: 1 }));
    assert.doesNotThrow(() => writeStoredJson('session', 'table', null));
  });

  it('is not available', () => {
    assert.equal(isStorageAvailable('local'), false);
    assert.equal(isStorageAvailable('session'), false);
  });
});

// ── No storage at all ───────────────────────

describe('with no storage (a Worker, Node)', () => {
  beforeEach(() => {
    install('localStorage', undefined);
    install('sessionStorage', undefined);
  });

  it('reads null, writes nothing, not available', () => {
    assert.equal(readStored('local', 'k'), null);
    assert.doesNotThrow(() => writeStored('local', 'k', 'v'));
    assert.doesNotThrow(() => writeStoredJson('session', 'k', [1]));
    assert.equal(readStoredJson('session', 'k'), null);
    assert.equal(isStorageAvailable('local'), false);
  });
});

// ── Storage full ────────────────────────────

describe('with storage full (setItem throws)', () => {
  let local;

  beforeEach(() => {
    local = fullStorage();
    local.map.set('theme', 'dark');
    local.map.set('table', '{"perPage":25}');
    install('localStorage', local);
    install('sessionStorage', memoryStorage());
  });

  it('writes do not throw, and change nothing', () => {
    assert.doesNotThrow(() => writeStored('local', 'theme', 'light'));
    assert.doesNotThrow(() => writeStoredJson('local', 'table', { perPage: 50 }));
    assert.equal(readStored('local', 'theme'), 'dark');
    assert.deepEqual(readStoredJson('local', 'table'), { perPage: 25 });
  });

  it('removing still works', () => {
    writeStored('local', 'theme', null);
    assert.equal(readStored('local', 'theme'), null);
  });

  it('is not available, while the other area is', () => {
    assert.equal(isStorageAvailable('local'), false);
    assert.equal(isStorageAvailable('session'), true);
  });
});
