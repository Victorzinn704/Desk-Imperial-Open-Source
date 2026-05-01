/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── Princípio 1: Domínio não depende de framework/infraestrutura ──────────
    {
      name: 'no-framework-package-in-domain',
      severity: 'error',
      comment:
        'Domain/entities must not import NestJS, Prisma, class-validator, bcrypt or any adapter package. Domain is portable.',
      from: {
        path: '^apps/api/src/modules/[^/]+/(domain|entities)/',
      },
      to: {
        dependencyTypes: ['npm'],
        path: '^(@nestjs/|@prisma/|class-validator|class-transformer|bcrypt|jsonwebtoken)',
      },
    },

    // ── Princípio 2: Controllers nunca importam DB direto ────────────────────
    {
      name: 'no-db-in-controllers',
      severity: 'error',
      comment:
        'Controllers must not access database or ORM directly. Use repository injection via DI.',
      from: {
        path: '\\.controller\\.ts$',
      },
      to: {
        path: '^apps/api/src/database|^@prisma/client',
      },
    },

    // ── Princípio 3: Services não importam Controllers ───────────────────────
    {
      name: 'no-controller-in-service',
      severity: 'error',
      comment:
        'Dependency direction is one-way: controller → service → repository. Services must not import controllers.',
      from: {
        path: '\\.service\\.ts$',
      },
      to: {
        path: '\\.controller\\.ts$',
      },
    },

    // ── Princípio 4: Web e API nunca se importam ─────────────────────────────
    {
      name: 'no-web-importing-api',
      severity: 'error',
      comment:
        'Frontend (apps/web) and backend (apps/api) must never import each other. ' +
        'Shared types live in packages/types or packages/api-contract.',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' },
    },
    {
      name: 'no-api-importing-web',
      severity: 'error',
      comment: 'Backend (apps/api) must never import frontend (apps/web).',
      from: { path: '^apps/api/' },
      to: { path: '^apps/web/' },
    },

    // ── Princípio 5: Imports de infraestrutura de auth restritos ─────────────
    {
      name: 'no-bcrypt-outside-auth',
      severity: 'error',
      comment:
        'bcrypt and password hashing must only occur inside the auth module infrastructure layer.',
      from: {
        path: '^apps/api/src/',
        pathNot: '^apps/api/src/modules/auth/',
      },
      to: {
        path: '^bcrypt$',
        dependencyTypes: ['npm'],
      },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg'],
    },
    exclude: {
      path: [
        '^node_modules',
        '\\.d\\.ts$',
        '^dist/',
        '^\\.next/',
        '^coverage/',
        '/generated/',
        'prisma/migrations/',
      ].join('|'),
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      archi: {
        collapsePattern:
          '^(node_modules|packages|apps/api/src/modules|apps/web/app)/[^/]+',
      },
    },
  },
};
