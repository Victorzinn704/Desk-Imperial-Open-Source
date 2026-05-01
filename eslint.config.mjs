import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPerf from 'eslint-plugin-react-perf';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Root ESLint configuration for the Desk Imperial monorepo.
 *
 * Philosophy:
 * - Enforce consistency across all TypeScript/TSX files
 * - Catch bugs before they reach production
 * - Keep files small and focused (max-lines rules)
 * - Organize imports automatically
 * - No magic numbers, no swallowed errors
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.log',
      '**/generated/**',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // === BASE RULES FOR ALL TS/TSX FILES ===
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react': reactPlugin,
    },
    rules: {
      // --- Code Size & Complexity ---
      'max-lines': ['warn', {
        max: 300,
        skipComments: true,
        skipBlankLines: true,
      }],
      'max-lines-per-function': ['warn', {
        max: 50,
        skipComments: true,
        skipBlankLines: true,
      }],
      'complexity': ['warn', 15],
      'max-depth': ['error', 4],
      'max-params': ['warn', 5],
      'max-nested-callbacks': ['error', 3],

      // --- Import Organization ---
      'sort-imports': ['warn', {
        ignoreCase: true,
        ignoreDeclarationSort: true, // Let import/order handle this
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      }],
      'no-duplicate-imports': 'error',

      // --- Code Quality ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-nested-ternary': 'warn',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'default-case': 'error',
      'no-return-await': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-throw-literal': 'error',

      // --- TypeScript ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',

      // --- React (applied to all, only triggers on TSX) ---
      ...reactHooks.configs.recommended.rules,
      'react/self-closing-comp': ['warn', { component: true, html: true }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // === API-SPECIFIC OVERRIDES ===
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-console': 'error', // Zero console.log in production API code
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'off',
      'react/self-closing-comp': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  // === WEB-SPECIFIC OVERRIDES ===
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-perf': reactPerf,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-sort-props': ['warn', {
        callbacksLast: true,
        shorthandFirst: true,
        noSortAlphabetically: false,
      }],
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'react-perf/jsx-no-new-array-as-prop': 'warn',
      'react-perf/jsx-no-new-function-as-prop': 'warn',
      'react-perf/jsx-no-jsx-as-prop': 'warn',
    },
  },

  // === SHARED PACKAGES ===
  {
    files: ['packages/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 200, skipComments: true, skipBlankLines: true }],
      'max-lines-per-function': ['warn', { max: 40, skipComments: true, skipBlankLines: true }],
    },
  },

  // === TEST FILES (relaxed rules) ===
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // === IMPORT PLUGIN (all TS/TSX) ===
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-self-import': 'error',
      'import/no-duplicates': 'error',
      // no-cycle is expensive — covered by madge in CI, kept as warn here
      'import/no-cycle': ['warn', { maxDepth: 5, ignoreExternal: true }],
    },
  },

);
