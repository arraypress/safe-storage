# @arraypress/safe-storage

> Browser storage that never throws. `localStorage` and
> `sessionStorage` for what a page remembers — a theme, a session, a
> table's settings — where storage being off reads null and writes
> nothing, so the page carries on without it.

Zero dependencies. ESM-only. Safe to import anywhere: in Node or a
Cloudflare Worker, where there's no storage at all, reads are null and
writes do nothing.

## Install

```bash
npm install @arraypress/safe-storage
```

## Why this exists

Storage can be off: a private window, blocked site data, a sandboxed
iframe. Then it isn't just empty — even *touching* `localStorage`
throws a `SecurityError`, before you get to `getItem`. A full quota
throws on `setItem`. So every read and write needs its own
`try`/`catch`, and the one you forget takes the page down with it.

This package is those `try`/`catch` blocks, once.

## Usage

```js
import {
  readStored, writeStored,
  readStoredJson, writeStoredJson,
  isStorageAvailable,
} from '@arraypress/safe-storage';

// Strings
writeStored('local', 'theme', 'dark');
readStored('local', 'theme');          // 'dark' (null when missing, or storage is off)
writeStored('local', 'theme', null);   // null removes it

// JSON
writeStoredJson('session', 'table', { perPage: 25, sort: 'total' });
readStoredJson('session', 'table');    // { perPage: 25, sort: 'total' }
readStoredJson('session', 'nothing');  // null (missing, or not JSON)
writeStoredJson('session', 'table', null);

// Will writes stick?
isStorageAvailable('local');           // false in a private window with storage blocked
```

## API

Every function takes an `area` first: `'local'` for `localStorage`
(kept across visits) or `'session'` for `sessionStorage` (this tab).

### `readStored(area, key)`

The stored string, or `null` when there's none — or storage is off.

### `writeStored(area, key, value)`

Stores `value` (a string). With `null`, removes the key. When storage
is off or full, does nothing.

```js
writeStored('local', 'banner-dismissed', '1');
writeStored('local', 'banner-dismissed', null); // forget it
```

An empty string is a value, not a removal.

### `readStoredJson(area, key)`

The parsed value, or `null` when there's none, it isn't JSON, or
storage is off. A bad value never throws — someone else's half-written
key just reads as nothing.

### `writeStoredJson(area, key, value)`

Stores `JSON.stringify(value)`. With `null`, removes the key. A value
JSON can't write (`undefined`, a function, a cycle, a BigInt) writes
nothing and leaves what was there.

### `isStorageAvailable(area)`

`true` when a write to the area sticks right now: it stores and removes
a probe key to find out. `false` when storage is off, missing, or full.
Use it to say "settings won't be remembered in this window", not as a
guard — the other functions are already safe.

## TypeScript

Ships with `.d.ts`. `readStoredJson` is generic:

```ts
import { readStoredJson, type StorageArea } from '@arraypress/safe-storage';

interface TableSettings { perPage: number; sort: string }

const area: StorageArea = 'session';
const settings = readStoredJson<TableSettings>(area, 'table'); // TableSettings | null
```

The type parameter is a promise you make about what's stored, not a
check — validate it if other code writes the same key.

## License

MIT
