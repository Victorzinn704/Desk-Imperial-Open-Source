import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/**/*.controller.ts',
    '!src/**/dto/**/*.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

export default config
