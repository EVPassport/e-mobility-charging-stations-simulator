/* eslint-disable n/no-unpublished-import */
import js from '@eslint/js'
import { defineFlatConfig } from 'eslint-define-config'
import jsdoc from 'eslint-plugin-jsdoc'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import neostandard, { plugins } from 'neostandard'

export default defineFlatConfig([
  {
    ignores: ['dist/**', 'ui/web/**'],
  },
  js.configs.recommended,
  plugins.promise.configs['flat/recommended'],
  ...plugins.n.configs['flat/mixed-esm-and-cjs'],
  jsdoc.configs['flat/recommended-typescript'],
  {
    rules: {
      'jsdoc/check-tag-names': [
        'warn',
        {
          typed: true,
          definedTags: ['defaultValue', 'experimental', 'typeParam'],
        },
      ],
    },
  },
  ...neostandard({
    ts: true,
  }),
  ...plugins['typescript-eslint'].config(
    ...plugins['typescript-eslint'].configs.strictTypeChecked,
    ...plugins['typescript-eslint'].configs.stylisticTypeChecked
  ),
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: [
      'src/charging-station/ChargingStation.ts',
      'src/charging-station/ocpp/OCPPServiceUtils.ts',
      'src/performance/PerformanceStatistics.ts',
    ],
    rules: {
      '@stylistic/operator-linebreak': 'off',
    },
  },
  {
    files: ['src/scripts/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...plugins['typescript-eslint'].configs.disableTypeChecked,
  },
])
