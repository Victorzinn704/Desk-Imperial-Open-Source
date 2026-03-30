import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    settings: {
      next: {
        rootDir: ['.', 'apps/web'],
      },
    },
  },
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
  {
    files: [
      'components/staff-mobile/mobile-order-builder.tsx',
      'components/dashboard/finance-chart.tsx',
      'components/dashboard/finance-doughnut-chart.tsx',
      'components/dashboard/metric-card.tsx',
      'components/dashboard/sales-performance-card.tsx',
      'components/dashboard/map-canvas.tsx',
      'components/dashboard/sales-map-canvas.tsx',
      'components/operations/operations-executive-grid.tsx',
      'components/operations/operations-timeline.tsx',
      'components/calendar/**/*.{ts,tsx,mts,cts}',
      'components/shared/lazy-components.tsx',
      'apps/web/components/dashboard/finance-chart.tsx',
      'apps/web/components/dashboard/finance-doughnut-chart.tsx',
      'apps/web/components/dashboard/metric-card.tsx',
      'apps/web/components/dashboard/sales-performance-card.tsx',
      'apps/web/components/dashboard/map-canvas.tsx',
      'apps/web/components/dashboard/sales-map-canvas.tsx',
      'apps/web/components/operations/operations-executive-grid.tsx',
      'apps/web/components/operations/operations-timeline.tsx',
      'apps/web/components/calendar/**/*.{ts,tsx,mts,cts}',
      'apps/web/components/shared/lazy-components.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default config
