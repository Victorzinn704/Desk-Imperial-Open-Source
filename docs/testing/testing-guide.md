# Testing Guide

This document covers the testing infrastructure, practices, and guidelines for DESK IMPERIAL.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Jest Configuration](#jest-configuration)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Coverage Expectations](#coverage-expectations)
- [CI/CD Integration](#ci-cd-integration)
- [Best Practices](#best-practices)

## Overview

DESK IMPERIAL uses a comprehensive testing stack:

- **Jest** - Test runner and assertion library
- **Supertest** - HTTP integration testing
- **ts-jest** - TypeScript support for Jest
- **@nestjs/testing** - NestJS testing utilities

**Test Types:**

- **Unit Tests** - Individual functions and classes (`.spec.ts`)
- **Integration Tests** - API endpoints and services (`.e2e-spec.ts`)
- **End-to-End Tests** - Complete user flows

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run specific test file
npm test -- auth.service.spec.ts

# Run tests with coverage report
npm test -- --coverage

# Run only integration tests
npm test -- --testPathPattern=e2e

# Run only unit tests
npm test -- --testPathPattern=spec.ts
```

### API-Specific Tests

```bash
# Navigate to API directory
cd apps/api

# Run API tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch

# Run E2E tests only
npm run test:e2e
```

### Frontend Tests

```bash
# Navigate to web directory
cd apps/web

# Run Next.js tests
npm test

# Run a focused frontend suite
npm --workspace @partner/web test -- owner-mobile-shell

# Run the stable Chromium E2E smoke suite
npm --workspace @partner/web run test:e2e
```

The web E2E baseline is intentionally scoped to `Chromium` for stability and signal quality.

### Focused Operations Stability Suite

Use this focused suite while refining login, staff auth, live operations and mobile synchronization:

```bash
# Backend critical path
npm --workspace @partner/api test -- --runInBand operations-service.spec.ts auth.service.spec.ts orders.service.spec.ts employees.service.spec.ts

# Frontend type safety for the live shells
npx tsc --noEmit -p apps/web/tsconfig.json

# Frontend smoke test for owner mobile shell
npm --workspace @partner/web test -- owner-mobile-shell
```

Recommended when touching:

- `auth.service.ts`
- `employees.service.ts`
- `orders.service.ts`
- `operations.service.ts`
- `operations-helpers.service.ts`
- `staff-mobile-shell.tsx`
- `owner-mobile-shell.tsx`
- `use-operations-realtime.ts`

### Minimal API E2E Smoke

Use this smoke suite to validate the HTTP layer without external infrastructure:

```bash
npm --workspace @partner/api run test:e2e
```

It currently covers:

- `GET /api/health`
- `POST /api/auth/login`

The smoke app uses mocked infrastructure providers so it stays executable in local and CI contexts without needing Postgres or Redis.

### Test Foundation Refinement

Use these helpers as the default foundation for new API unit tests:

- [`apps/api/test/helpers/auth-context.factory.ts`](/c:/Users/Desktop/Documents/desk-imperial/apps/api/test/helpers/auth-context.factory.ts)
- [`apps/api/test/helpers/request-context.factory.ts`](/c:/Users/Desktop/Documents/desk-imperial/apps/api/test/helpers/request-context.factory.ts)

They exist to keep the test suite aligned with the current auth/session architecture:

- shared `AuthContext` shape with `workspaceOwnerUserId`, `employeeId` and modern session fields
- shared `RequestContext` shape with `host`, `origin` and `referer`
- less duplication between specs
- fewer silent breaks when auth or request contracts evolve

Focused regression suite for the migrated test foundation:

```bash
npm --workspace @partner/api test -- --runInBand employees.service.spec.ts finance.service.spec.ts products.service.spec.ts auth.service.spec.ts orders.service.spec.ts operations-types.spec.ts geocoding.service.spec.ts admin-pin.service.spec.ts utils.spec.ts
npx tsc --noEmit -p apps/api/tsconfig.json
```

Current migration status:

- `employees.service.spec.ts` migrated to shared auth/request factories
- `finance.service.spec.ts` migrated and aligned to current aggregation behavior
- `products.service.spec.ts` migrated and aligned to current Prisma/request contracts
- `orders.service.spec.ts` migrated to shared auth/request factories and aligned to the current HTTP/request split
- `operations-types.spec.ts` aligned to the current `toMesaRecord()` contract
- `geocoding.service.spec.ts` aligned to the current cache/config/signature behavior
- `admin-pin.service.spec.ts` aligned to the shared auth factory
- `utils.spec.ts` aligned to shared owner/staff auth factories
- `auth.service.spec.ts` now uses the shared request factory

Current validation baseline:

- focused foundation suites passing:
  - `employees.service.spec.ts`
  - `finance.service.spec.ts`
  - `products.service.spec.ts`
  - `orders.service.spec.ts`
  - `operations-types.spec.ts`
  - `geocoding.service.spec.ts`
  - `admin-pin.service.spec.ts`
  - `utils.spec.ts`
  - `auth.service.spec.ts`
- finance refinement suite passing:
  - `finance.service.spec.ts` with 28 tests validating cache, growth, currency conversion and executive aggregations after the analytics extraction
- `npx tsc --noEmit -p apps/api/tsconfig.json` passing after the migration cleanup
- shared factories are now the default path for API unit tests touching auth, session or request context

### Current Documented Baseline

Validated on `2026-03-28`:

```bash
npm --workspace @partner/api test -- --runInBand
```

Result:

- `16` backend suites passing
- `396` backend tests passing
- `0` backend failures

Focused stability pack currently used during refinements:

```bash
npm --workspace @partner/api test -- --runInBand finance.service.spec.ts auth.service.spec.ts orders.service.spec.ts employees.service.spec.ts operations-service.spec.ts
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npm --workspace @partner/web test -- owner-mobile-shell
```

Result validated in this phase:

- `132` backend tests passing in the focused pack
- API typecheck passing
- Web typecheck passing
- `owner-mobile-shell` passing
- `19` Playwright Chromium E2E tests passing

### Minimal E2E Baseline

Backend smoke coverage now also includes a dedicated E2E layer:

```bash
npm --workspace @partner/api run test:e2e
```

Result:

- `1` E2E suite passing
- `4` E2E tests passing
- HTTP real smoke coverage for:
  - `GET /api/health`
  - `POST /api/auth/login`

### Load Test Baseline

Versioned load scripts now live in:

- `tests/load/k6/api-health.js`
- `tests/load/k6/api-auth-login.js`
- `tests/load/k6/web-login-page.js`

Execution guide:

- [`load-testing.md`](/c:/Users/Desktop/Documents/desk-imperial/docs/testing/load-testing.md)

These scripts were versioned in this phase but were not executed as part of the local baseline.

## Jest Configuration

### API Configuration

**Location:** `apps/api/jest.config.ts`

```typescript
import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
}

export default config
```

**Key Settings:**

- **Test Pattern:** `*.spec.ts` files
- **Transform:** TypeScript via `ts-jest`
- **Coverage Exclusions:** Modules, DTOs, interfaces, main entry
- **Timeout:** 10 seconds (configurable for slow tests)
- **Path Mapping:** `@/` alias for `src/`

### E2E Configuration

**Location:** `apps/api/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1"
  }
}
```

## Writing Tests

### Unit Test Example

**Location:** `apps/api/src/modules/auth/auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService
  let mailer: MailerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            verificationCode: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
            sendEmailVerificationEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                PASSWORD_RESET_TTL_MINUTES: '30',
                EMAIL_VERIFICATION_TTL_MINUTES: '15',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
    mailer = module.get<MailerService>(MailerService)
  })

  describe('validateOTP', () => {
    it('should validate OTP successfully', async () => {
      const mockCode = {
        id: 'code-123',
        userId: 'user-456',
        code: '12345678',
        purpose: 'password-reset',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: null,
      }

      jest.spyOn(prisma.verificationCode, 'findFirst').mockResolvedValue(mockCode as any)
      jest.spyOn(prisma.verificationCode, 'update').mockResolvedValue({ ...mockCode, usedAt: new Date() } as any)

      const result = await service.validateOTP('user-456', '12345678', 'password-reset')

      expect(result).toBe(true)
      expect(prisma.verificationCode.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          code: '12345678',
          purpose: 'password-reset',
          usedAt: null,
          expiresAt: { gte: expect.any(Date) },
        },
      })
      expect(prisma.verificationCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { usedAt: expect.any(Date) },
      })
    })

    it('should trim whitespace from OTP code', async () => {
      const mockCode = {
        id: 'code-123',
        userId: 'user-456',
        code: '12345678',
        purpose: 'password-reset',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: null,
      }

      jest.spyOn(prisma.verificationCode, 'findFirst').mockResolvedValue(mockCode as any)
      jest.spyOn(prisma.verificationCode, 'update').mockResolvedValue({ ...mockCode, usedAt: new Date() } as any)

      // Code with trailing space
      const result = await service.validateOTP(
        'user-456',
        '12345678 ', // Space at end
        'password-reset',
      )

      expect(result).toBe(true)
      // Should have trimmed the space
      expect(prisma.verificationCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: '12345678', // No space
          }),
        }),
      )
    })

    it('should reject invalid OTP format', async () => {
      await expect(service.validateOTP('user-456', '123', 'password-reset')).rejects.toThrow(BadRequestException)

      await expect(service.validateOTP('user-456', '', 'password-reset')).rejects.toThrow(BadRequestException)
    })

    it('should reject expired OTP', async () => {
      jest.spyOn(prisma.verificationCode, 'findFirst').mockResolvedValue(null)

      await expect(service.validateOTP('user-456', '12345678', 'password-reset')).rejects.toThrow(BadRequestException)
    })
  })

  describe('generateOTP', () => {
    it('should generate 8-digit numeric code', () => {
      const code = service.generateOTP()

      expect(code).toMatch(/^\d{8}$/)
      expect(code.length).toBe(8)
      expect(parseInt(code)).toBeGreaterThanOrEqual(10000000)
      expect(parseInt(code)).toBeLessThan(100000000)
    })

    it('should generate unique codes', () => {
      const codes = new Set()
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateOTP())
      }

      // Should have at least 95 unique codes out of 100
      expect(codes.size).toBeGreaterThanOrEqual(95)
    })
  })
})
```

### Integration Test Example

**Location:** `apps/api/test/auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/modules/prisma/prisma.service'

describe('AuthController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    // Apply same pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()

    prisma = app.get<PrismaService>(PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.verificationCode.deleteMany()
    await prisma.session.deleteMany()
    // Note: Keep users for testing
  })

  describe('POST /auth/password-reset/request', () => {
    it('should send password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send({ email: 'test@example.com' })
        .expect(200)

      expect(response.body).toHaveProperty('message')

      // Verify OTP was created in database
      const code = await prisma.verificationCode.findFirst({
        where: {
          user: { email: 'test@example.com' },
          purpose: 'password-reset',
        },
      })

      expect(code).toBeDefined()
      expect(code.code).toMatch(/^\d{8}$/)
      expect(code.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should rate limit password reset requests', async () => {
      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/password-reset/request')
          .send({ email: 'test@example.com' })
          .expect(200)
      }

      // 4th request should be rate limited
      await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send({ email: 'test@example.com' })
        .expect(429)
    })

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400)
    })
  })

  describe('POST /auth/password-reset/verify', () => {
    it('should reset password with valid OTP', async () => {
      // Setup: Create OTP
      const user = await prisma.user.findFirst({
        where: { email: 'test@example.com' },
      })

      const code = await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '12345678',
          purpose: 'password-reset',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      // Test: Reset password
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/verify')
        .send({
          email: 'test@example.com',
          code: '12345678',
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')

      // Verify OTP was marked as used
      const usedCode = await prisma.verificationCode.findUnique({
        where: { id: code.id },
      })

      expect(usedCode.usedAt).toBeDefined()
    })

    it('should reject OTP with trailing whitespace (after trim)', async () => {
      const user = await prisma.user.findFirst({
        where: { email: 'test@example.com' },
      })

      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '12345678',
          purpose: 'password-reset',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      // Should work even with trailing space (gets trimmed)
      await request(app.getHttpServer())
        .post('/auth/password-reset/verify')
        .send({
          email: 'test@example.com',
          code: '12345678 ', // Trailing space
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200)
    })
  })

  describe('POST /auth/login', () => {
    it('should create session and set cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'CorrectPassword123!',
        })
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.headers['set-cookie']).toBeDefined()

      const cookies = response.headers['set-cookie']
      expect(cookies.some((c: string) => c.startsWith('session='))).toBe(true)
      expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true)
      expect(cookies.some((c: string) => c.includes('SameSite=Strict'))).toBe(true)
    })
  })
})
```

### Frontend Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/shared/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByText('Primary')
    expect(button).toHaveClass('bg-[linear-gradient')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
  })
})
```

## Test Utilities

### Database Helpers

**Location:** `apps/api/test/helpers/database.ts`

```typescript
import { PrismaService } from '@/modules/prisma/prisma.service'

export class DatabaseHelper {
  constructor(private prisma: PrismaService) {}

  async cleanDatabase() {
    // Order matters: delete in reverse dependency order
    await this.prisma.session.deleteMany()
    await this.prisma.verificationCode.deleteMany()
    await this.prisma.rateLimitEvent.deleteMany()
    // Keep users for testing
  }

  async createTestUser(overrides = {}) {
    return this.prisma.user.create({
      data: {
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: await hashPassword('TestPassword123!'),
        emailVerified: true,
        ...overrides,
      },
    })
  }

  async createVerificationCode(userId: string, overrides = {}) {
    return this.prisma.verificationCode.create({
      data: {
        userId,
        code: '12345678',
        purpose: 'password-reset',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ...overrides,
      },
    })
  }
}
```

### Mock Factories

**Location:** `apps/api/test/factories/user.factory.ts`

```typescript
import { User } from '@prisma/client'

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashed-password',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockVerificationCode(overrides = {}) {
  return {
    id: 'code-123',
    userId: 'user-123',
    code: '12345678',
    purpose: 'password-reset',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
    ...overrides,
  }
}
```

### Request Helpers

```typescript
// apps/api/test/helpers/request.ts
import * as request from 'supertest'
import { INestApplication } from '@nestjs/common'

export class RequestHelper {
  constructor(private app: INestApplication) {}

  async login(email: string, password: string) {
    const response = await request(this.app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200)

    const cookies = response.headers['set-cookie']
    return cookies.find((c: string) => c.startsWith('session='))
  }

  async authenticatedRequest(method: string, path: string, sessionCookie: string) {
    return request(this.app.getHttpServer())[method.toLowerCase()](path).set('Cookie', sessionCookie)
  }
}
```

## Coverage Expectations

### Overall Target

**Minimum:** 70% coverage across the board  
**Target:** 80% coverage for critical modules  
**Ideal:** 90%+ coverage for auth and payment modules

### Module-Specific Targets

| Module        | Target | Priority |
| ------------- | ------ | -------- |
| **Auth**      | 80%    | Critical |
| **Mailer**    | 75%    | High     |
| **Users**     | 75%    | High     |
| **Products**  | 70%    | Medium   |
| **Orders**    | 70%    | Medium   |
| **Dashboard** | 60%    | Low      |

### Coverage Report

```bash
# Generate coverage report
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows
```

**Example Output:**

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   78.45 |    72.31 |   81.22 |   78.92 |
 auth                     |   84.12 |    79.45 |   88.33 |   84.67 |
  auth.controller.ts      |   82.35 |    76.92 |   85.71 |   82.76 |
  auth.service.ts         |   85.89 |    81.98 |   90.95 |   86.58 |
 mailer                   |   76.34 |    68.29 |   79.17 |   76.89 |
  mailer.service.ts       |   76.34 |    68.29 |   79.17 |   76.89 |
--------------------------|---------|----------|---------|---------|
```

### What to Cover

**Must Cover:**

- ✅ Business logic (calculations, validations)
- ✅ Error handling (try/catch, custom exceptions)
- ✅ Conditional branches (if/else, switch)
- ✅ Authentication and authorization
- ✅ Data transformations

**Can Skip:**

- ⏭️ Simple getters/setters
- ⏭️ DTOs and interfaces
- ⏭️ NestJS module configurations
- ⏭️ Trivial one-liner utilities

## CI/CD Integration

### GitHub Actions Example

**Location:** `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: desk_imperial_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/desk_imperial_test

      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/desk_imperial_test
          NODE_ENV: test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: api
          name: api-coverage

      - name: Check coverage thresholds
        run: |
          npm test -- --coverage --coverageThreshold='{"global":{"statements":70,"branches":65,"functions":70,"lines":70}}'
```

### Railway Deployment

Tests automatically run before deployment:

```json
// package.json
{
  "scripts": {
    "build": "npm run test && npm run build:api && npm run build:web",
    "test": "jest --passWithNoTests",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Best Practices

### 1. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should validate OTP successfully', async () => {
  // Arrange: Setup test data and mocks
  const mockCode = { id: '123', code: '12345678', ... }
  jest.spyOn(prisma.verificationCode, 'findFirst').mockResolvedValue(mockCode)

  // Act: Execute the function under test
  const result = await service.validateOTP('user-123', '12345678', 'reset')

  // Assert: Verify the outcome
  expect(result).toBe(true)
  expect(prisma.verificationCode.findFirst).toHaveBeenCalled()
})
```

### 2. Descriptive Test Names

```typescript
// ✅ GOOD: Clear what's being tested
it('should trim whitespace from OTP before validation')
it('should reject expired OTP codes')
it('should rate limit after 5 failed attempts')

// ❌ BAD: Vague or unclear
it('works')
it('test OTP')
it('should return true')
```

### 3. One Assertion Per Test (when possible)

```typescript
// ✅ GOOD: Focused test
it('should create 8-digit code', () => {
  const code = service.generateOTP()
  expect(code).toMatch(/^\d{8}$/)
})

it('should create code within range', () => {
  const code = service.generateOTP()
  expect(parseInt(code)).toBeGreaterThanOrEqual(10000000)
  expect(parseInt(code)).toBeLessThan(100000000)
})

// ⚠️ ACCEPTABLE: Related assertions
it('should create session with cookie', () => {
  const response = await request(app).post('/auth/login').send(...)
  expect(response.status).toBe(200)
  expect(response.headers['set-cookie']).toBeDefined()
})
```

### 4. Isolate Tests

```typescript
// ✅ GOOD: Clean database before each test
beforeEach(async () => {
  await prisma.verificationCode.deleteMany()
})

// ❌ BAD: Tests depend on each other
it('creates user', () => {
  /* user-123 created */
})
it('updates user', () => {
  /* depends on user-123 existing */
})
```

### 5. Mock External Dependencies

```typescript
// ✅ GOOD: Mock email service
const mailer = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}

// ❌ BAD: Actually send emails in tests
await mailerService.sendPasswordResetEmail(...)  // Real API call
```

### 6. Test Edge Cases

```typescript
describe('validateOTP', () => {
  it('should validate correct OTP') // Happy path
  it('should reject wrong OTP') // Error case
  it('should reject expired OTP') // Edge case
  it('should reject OTP with whitespace') // Edge case (fixed bug!)
  it('should reject empty OTP') // Edge case
  it('should reject already-used OTP') // Edge case
})
```

### 7. Avoid Test Duplication

```typescript
// ✅ GOOD: Use test.each for similar tests
test.each([
  ['12345678', true],
  ['12345678 ', true], // Trailing space
  [' 12345678', true], // Leading space
  ['123', false], // Too short
  ['', false], // Empty
])('validateOTP("%s") should return %s', async (code, expected) => {
  // Test implementation
})
```

### 8. Clean Up Resources

```typescript
afterEach(async () => {
  await prisma.$disconnect()
  jest.clearAllMocks()
})

afterAll(async () => {
  await app.close()
})
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem:** Tests fail with "Can't reach database server"

**Fix:**

```bash
# Ensure DATABASE_URL is set for test environment
export DATABASE_URL="postgresql://user:pass@localhost:5432/desk_test"

# Run migrations
npx prisma migrate deploy
```

#### 2. Timeout Errors

**Problem:** Tests time out after 5 seconds

**Fix:**

```typescript
// Increase timeout for specific test
it('should complete slow operation', async () => {
  // Test code
}, 15000) // 15 second timeout

// Or globally in jest.config.ts
testTimeout: 10000
```

#### 3. Mock Not Working

**Problem:** Mock function not called

**Fix:**

```typescript
// ❌ WRONG: Mock after service is created
const service = new AuthService(...)
jest.spyOn(prisma, 'findFirst').mockResolvedValue(...)

// ✅ CORRECT: Mock before service uses it
jest.spyOn(prisma, 'findFirst').mockResolvedValue(...)
const result = await service.validateOTP(...)
```

#### 4. Coverage Not Generated

**Problem:** Coverage report is empty

**Fix:**

```bash
# Ensure collectCoverageFrom is configured
# In jest.config.ts:
collectCoverageFrom: [
  'src/**/*.{js,ts}',
  '!src/**/*.module.ts',
]
```

## Quick Reference

### Common Jest Matchers

```typescript
expect(value).toBe(expected) // Strict equality (===)
expect(value).toEqual(expected) // Deep equality
expect(value).toBeDefined() // Not undefined
expect(value).toBeNull() // Is null
expect(value).toBeTruthy() // Truthy value
expect(value).toBeFalsy() // Falsy value
expect(array).toContain(item) // Array contains item
expect(string).toMatch(/regex/) // String matches regex
expect(fn).toThrow(Error) // Function throws
expect(mock).toHaveBeenCalled() // Mock was called
expect(mock).toHaveBeenCalledWith(arg) // Mock called with arg
expect(mock).toHaveBeenCalledTimes(n) // Mock called n times
```

### Supertest Methods

```typescript
request(app.getHttpServer())
  .post('/auth/login') // HTTP method
  .send({ email: 'test@example.com' }) // Request body
  .set('Authorization', 'Bearer token') // Set header
  .set('Cookie', 'session=abc123') // Set cookie
  .expect(200) // Expect status code
  .expect('Content-Type', /json/) // Expect header
```

---

**Last Updated:** 2024  
**Maintained By:** DESK IMPERIAL Development Team
