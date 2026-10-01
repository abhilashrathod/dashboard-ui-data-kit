import { config } from 'zod/mini'
import { en } from 'zod/locales'

/*
 * The one place the contracts get Zod from. Import it as a namespace:
 *
 *   import * as z from './zod'
 *
 * `zod/mini` is Zod's tree-shakable build (functional API: `.check(z.minLength(2))`
 * instead of `.min(2)`). These schemas ship in the demo bundle, so size matters.
 *
 * - Re-exported with `export *`, not `export { z }`: some bundlers can't
 *   tree-shake a namespace passed around as a value. esbuild (used by Vitest
 *   and Storybook dependency pre-bundling) kept all of Zod that way (~420 KB vs
 *   ~17 KB minified). Vite's production build handles both shapes.
 * - Unlike classic `zod`, mini loads no error messages, so every failure would
 *   read "Invalid input". Messages reach users through API `fieldErrors`, so
 *   the English locale is configured here, once, before any schema is used.
 */
config(en())

export * from 'zod/mini'
