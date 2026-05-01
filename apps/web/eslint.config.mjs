import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: ['coverage/**', 'components/charts/**', '.next/**', 'node_modules/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    settings: {
      next: {
        rootDir: ['.', 'apps/web'],
      },
    },
  },

  // --- Code Size & Complexity (all TS/TSX) ---
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'max-lines': [
        'warn',
        {
          max: 300,
          skipComments: true,
          skipBlankLines: true,
        },
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 50,
          skipComments: true,
          skipBlankLines: true,
        },
      ],
      complexity: ['warn', 15],
      'max-depth': ['error', 4],
      'max-params': ['warn', 5],
      'max-nested-callbacks': ['error', 3],

      // --- Import Organization ---
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
          allowSeparatedGroups: true,
        },
      ],
      'no-duplicate-imports': 'error',

      // --- Code Quality ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-nested-ternary': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'default-case': 'error',
      'no-return-await': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-throw-literal': 'error',

      // --- TypeScript ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/prefer-as-const': 'warn',

      // --- React ---
      'react-hooks/exhaustive-deps': 'error',
      'react/self-closing-comp': ['warn', { component: true, html: true }],
      'react/jsx-sort-props': [
        'warn',
        {
          callbacksLast: true,
          shorthandFirst: true,
          noSortAlphabetically: false,
        },
      ],
    },
  },

  // --- Restricted Imports (heavy libs) ---
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['ag-grid-community', 'ag-grid-community/**', 'ag-grid-react', 'ag-grid-react/**'],
              message: 'Importe AG Grid apenas pelos wrappers de operacao que ja fazem o lazy loading.',
            },
            {
              group: ['leaflet', 'leaflet/**', 'react-leaflet', 'react-leaflet/**'],
              message: 'Importe Leaflet apenas pelos pontos de mapa autorizados.',
            },
            {
              group: ['react-big-calendar', 'react-big-calendar/**'],
              message: 'Importe react-big-calendar apenas pelos wrappers de calendario e timeline.',
            },
            {
              group: ['recharts', 'recharts/**'],
              message: 'Importe Recharts apenas em componentes de dashboard autorizados.',
            },
          ],
        },
      ],
    },
  },

  // --- Exceptions for lazy-loaded components ---
  {
    files: [
      'components/staff-mobile/mobile-order-builder.tsx',
      'apps/web/components/staff-mobile/mobile-order-builder.tsx',
      'components/dashboard/finance-chart.tsx',
      'components/dashboard/chart-responsive-container.tsx',
      'components/dashboard/finance-doughnut-chart.tsx',
      'components/dashboard/metric-card.tsx',
      'components/dashboard/sales-performance-card.tsx',
      'components/dashboard/map-canvas.tsx',
      'components/dashboard/sales-map-canvas.tsx',
      'components/operations/operations-executive-grid.tsx',
      'components/operations/operations-timeline.tsx',
      'components/calendar/**/*.{ts,tsx,mts,cts}',
      'components/charts/**/*.{ts,tsx,mts,cts}',
      'components/shared/lazy-components.tsx',
      'apps/web/components/dashboard/finance-chart.tsx',
      'apps/web/components/dashboard/chart-responsive-container.tsx',
      'apps/web/components/dashboard/finance-doughnut-chart.tsx',
      'apps/web/components/dashboard/metric-card.tsx',
      'apps/web/components/dashboard/sales-performance-card.tsx',
      'apps/web/components/dashboard/map-canvas.tsx',
      'apps/web/components/dashboard/sales-map-canvas.tsx',
      'apps/web/components/operations/operations-executive-grid.tsx',
      'apps/web/components/operations/operations-timeline.tsx',
      'apps/web/components/calendar/**/*.{ts,tsx,mts,cts}',
      'apps/web/components/charts/**/*.{ts,tsx,mts,cts}',
      'apps/web/components/shared/lazy-components.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },

  // --- Test Files (relaxed) ---
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
]

export default config
