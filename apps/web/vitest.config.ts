import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const sonarCoverageMode = process.env.SONAR_COVERAGE === 'true'
const coverageExclude = [
  '**/*.d.ts',
  '**/test/**',
  '**/e2e/**',
  'components/owner-mobile/**',
  'components/shared/**',
  'lib/operations/index.ts',
  'lib/operations/operations-types.ts',
]

if (!sonarCoverageMode) {
  coverageExclude.splice(4, 0, 'components/operations/use-operations-realtime.ts')
  coverageExclude.splice(4, 0, 'components/staff-mobile/**')
}

export default defineConfig({
  resolve: {
    alias: {
      '@': currentDir,
      '@contracts/contracts': path.resolve(currentDir, '../../packages/types/src/index'),
    },
  },
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
