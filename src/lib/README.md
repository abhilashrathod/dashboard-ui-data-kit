# lib

Small framework-agnostic utilities with no React or UI dependencies.

- `cn.ts`: `clsx` + `tailwind-merge` class-name composition.
- `api.ts`: minimal JSON fetch helper (resolves paths against the page origin so it also works under Node's fetch in tests).
