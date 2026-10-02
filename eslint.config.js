import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/*
 * Raw Tailwind palette classes (bg-orange-500, text-slate-600, border-white, …).
 * The theme resets the default palette, so they would generate no CSS at all;
 * this rule makes the mistake loud. Use semantic token classes instead.
 * esquery regexes can't contain "/", so keep this pattern slash-free.
 */
const RAW_PALETTE_CLASS = [
  String.raw`\b(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder)-`,
  String.raw`((slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}|white|black)\b`,
].join('')
const RAW_PALETTE_MESSAGE =
  'Raw Tailwind palette classes are disabled. Use a semantic token class (bg-surface, text-fg-muted, bg-status-danger-subtle, …). See src/tokens/README.md.'

export default defineConfig([
  globalIgnores(['dist', 'storybook-static', 'coverage', 'public/mockServiceWorker.js']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${RAW_PALETTE_CLASS}/]`, message: RAW_PALETTE_MESSAGE },
        {
          selector: `TemplateElement[value.raw=/${RAW_PALETTE_CLASS}/]`,
          message: RAW_PALETTE_MESSAGE,
        },
      ],
    },
  },

  // Components export their cva variants (plus StatusPill's status map and the
  // useToast / useAnnounce hooks, which share private context) next to
  // the component, by convention (docs/component-conventions.md). Editing one of
  // these triggers a full reload instead of fast refresh, which is acceptable.
  {
    files: ['src/components/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowExportNames: [
            'buttonVariants',
            'iconButtonVariants',
            'inputVariants',
            'checkboxVariants',
            'badgeVariants',
            'badgeDotVariants',
            'ORDER_STATUS_DISPLAY',
            'deltaChipVariants',
            'cardVariants',
            'amountVariants',
            'spinnerVariants',
            'skeletonVariants',
            'dialogContentVariants',
            'drawerContentVariants',
            'useToast',
            'useAnnounce',
            'emptyStateVariants',
            'ERROR_COPY',
            'avatarVariants',
          ],
        },
      ],
    },
  },

  // Story files, Storybook config and test helpers export non-components by design.
  {
    files: [
      '**/*.stories.tsx',
      '.storybook/**/*.tsx',
      'src/test/**/*.tsx',
      '**/__tests__/**/*.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  storybook.configs['flat/recommended'],
])
