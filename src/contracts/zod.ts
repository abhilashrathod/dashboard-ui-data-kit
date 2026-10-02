import * as z from 'zod/mini'
import { en } from 'zod/locales'

/*
 * The one place the contracts get Zod from:
 *
 *   import { z } from './zod'
 *
 * `zod/mini` is Zod's tree-shakable build (functional API: `.check(z.minLength(2))`
 * instead of `.min(2)`). These schemas ship in the demo bundle, so size matters.
 *
 * - Exported as a namespace value (`export { z }`), NOT `export * from 'zod/mini'`.
 *   The `export *` form broke the production Storybook build: Rolldown ran our
 *   contracts before Zod's `iso` classes were initialised, so `z.iso.datetime()`
 *   threw "e is not a constructor" and every story failed to load. Vite's app
 *   build produces the same size either way.
 * - Unlike classic `zod`, mini loads no error messages, so every failure would
 *   read "Invalid input". Messages reach users through API `fieldErrors`, so
 *   the English locale is configured here, once, before any schema is used.
 */
z.config(en())

export { z }
