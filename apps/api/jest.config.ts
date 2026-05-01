import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@contracts/contracts$': '<rootDir>/../../packages/types/src/index.ts',
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
  ...(process.env.SONAR_COVERAGE === 'true'
    ? {}
    : {
        coverageThreshold: {
          global: {
            branches: 70,
            functions: 90,
            lines: 90,
            statements: 90,
          },
        },
      }),
}

export default config
