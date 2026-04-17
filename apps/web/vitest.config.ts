import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vitest-tsconfig-paths'

const sonarCoverageMode = process.env.SONAR_COVERAGE === 'true'
const coverageExclude = [
  '**/*.d.ts',
  '**/test/**',
  '**/e2e/**',
  'components/shared/**',
  'lib/operations/index.ts',
  'lib/operations/operations-types.ts',
]

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      all: false,
      exclude: coverageExclude,
      thresholds: sonarCoverageMode
        ? undefined
        : {
            statements: 85,
            branches: 65,
            functions: 85,
            lines: 85,
          },
    },
  },
})
