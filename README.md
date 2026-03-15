# Partner Portal Monorepo

Base arquitetural do projeto com foco em:

- UX/UI forte e moderna
- seguranca por padrao
- LGPD, cookies e aceite versionado
- monitoramento, logs e trilha de auditoria
- separacao clara entre front, back e pacotes compartilhados

## Visao geral

Este repositorio foi organizado como monorepo para manter o projeto escalavel, seguro e bem separado desde o inicio.

### Arvore principal

```text
test1/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  │  ├─ cadastro/
│  │  │  ├─ dashboard/
│  │  │  ├─ login/
│  │  │  ├─ globals.css
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx
│  │  ├─ components/
│  │  │  ├─ shared/
│  │  │  ├─ marketing/
│  │  │  ├─ auth/
│  │  │  └─ dashboard/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ providers/
│  │  └─ styles/
│  └─ api/
│     ├─ prisma/
│     │  ├─ migrations/
│     │  ├─ schema.prisma
│     │  └─ seed.ts
│     ├─ src/
│     │  ├─ common/
│     │  │  ├─ config/
│     │  │  ├─ decorators/
│     │  │  ├─ filters/
│     │  │  ├─ guards/
│     │  │  ├─ interceptors/
│     │  │  ├─ pipes/
│     │  │  └─ utils/
│     │  ├─ database/
│     │  ├─ observability/
│     │  └─ modules/
│     │     ├─ auth/
│     │     ├─ users/
│     │     ├─ products/
│     │     ├─ finance/
│     │     ├─ consent/
│     │     └─ monitoring/
│     └─ test/
├─ packages/
│  ├─ ui/
│  │  └─ src/
│  │     ├─ components/
│  │     └─ tokens/
│  ├─ types/
│  │  └─ src/
│  └─ config/
│     ├─ eslint/
│     └─ typescript/
├─ docs/
│  ├─ architecture/
│  └─ security/
├─ infra/
│  ├─ docker/
│  └─ scripts/
├─ .editorconfig
├─ .env.example
├─ .gitignore
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json
```

## Responsabilidades

- `apps/web`: interface Next.js, marketing, login, cadastro, dashboard e componentes de UX/UI.
- `apps/api`: API NestJS com auth, produtos, financeiro, consentimento, logs e monitoramento.
- `packages/ui`: design system compartilhado.
- `packages/types`: contratos de tipos entre front e back.
- `packages/config`: configuracoes centralizadas de lint e TypeScript.
- `docs`: arquitetura, seguranca, fluxo LGPD e decisoes de produto.
- `infra`: docker, scripts locais e base de ambiente.

## Boas praticas base

- componentes pequenos e reutilizaveis
- separacao entre camada de apresentacao, dominio e infraestrutura
- validacao de entrada no front e no back
- sessoes seguras com cookies `HttpOnly`, `Secure` e `SameSite`
- trilha de auditoria para eventos sensiveis
- mascaramento de dados pessoais em logs
- documentacao clara desde o inicio

## O que ja existe

- home institucional em dark neutral premium
- login conectado ao contrato real da API
- cadastro com senha forte, aceite de termos e preferencias de cookies
- dashboard autenticado com sessao, consentimento, portfolio e vendas
- schema Prisma com usuarios, sessoes, consentimentos, logs e produtos
- pedidos com baixa de estoque e cancelamento com estorno
- financeiro com estoque potencial, receita realizada e comparativo mensal
- migration inicial versionada em `apps/api/prisma/migrations`
- seed preparado para documentos legais, usuario demo e produtos base

## Rotas atuais do front

- `/`
- `/login`
- `/cadastro`
- `/dashboard`

## Fluxo local recomendado

1. copiar `.env.example` para `.env`
2. garantir um PostgreSQL local ou instalar Docker
3. rodar `npm --workspace @partner/api run prisma:generate`
4. rodar `npm --workspace @partner/api run prisma:migrate:dev`
5. rodar `npm run seed`
6. subir `apps/api` e `apps/web`

## Proximos passos

1. ligar banco local e aplicar migration + seed
2. testar login/cadastro de ponta a ponta
3. abrir pedidos multi-itens, pendencias e operacao de entrega
4. evoluir monitoramento externo e health checks
5. iniciar design system compartilhado em `packages/ui`

## Referencias oficiais usadas para esta base

- Next.js App Router: https://nextjs.org/docs/app
- NestJS First Steps: https://docs.nestjs.com/first-steps
- Tailwind com Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- React Three Fiber: https://r3f.docs.pmnd.rs/getting-started/introduction
