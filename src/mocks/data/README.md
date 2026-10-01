# mocks/data

Seeded order data and the in-memory db behind the MSW handlers.

- **Why seeded:** the same seed + anchor always produce the same orders, so screenshots, stories and tests are reproducible, and a bug seen in the demo can be replayed exactly.
- **Why no faker:** these mocks ship in the deployed demo bundle. A ~1 KB seeded RNG (`random.ts`) plus small word lists (`wordlists.ts`) cover what we need, at a fraction of faker's size.
- **The anchor:** every date is relative to `anchor` (orders span the 18 months before it). In the browser, `resetDb()` defaults it to local midnight today, so the demo always looks current. Tests pass a fixed date (`2026-09-30T00:00:00Z`) so their numbers never drift.
- **Mutations** (create and bulk update, from Stage 1e) live in memory for the page session only. A reload re-seeds.
