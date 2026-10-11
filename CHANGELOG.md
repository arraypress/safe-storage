# Changelog

All notable changes to `@arraypress/safe-storage` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-10-12

### Initial Release

- `readStored(area, key)` — a stored string, or null when there's none
  or storage is off.
- `writeStored(area, key, value)` — store a string; null removes it.
  Does nothing when storage is off or full.
- `readStoredJson(area, key)` — a stored JSON value, or null when
  there's none, it isn't JSON, or storage is off.
- `writeStoredJson(area, key, value)` — store a value as JSON; null
  removes it. A value JSON can't write (`undefined`, a function, a
  cycle, a BigInt) writes nothing.
- `isStorageAvailable(area)` — whether a write sticks right now (false
  when storage is off, missing, or full).
- `area` is `'local'` (`localStorage`) or `'session'`
  (`sessionStorage`); type `StorageArea`.

From FlareCart's pages, where storage that's off (a private window,
blocked site data) throws on first touch. Zero dependencies, ESM-only;
safe to import in Node and Workers, where there's no storage at all.
