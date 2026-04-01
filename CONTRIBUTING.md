# Como Contribuir — Desk Imperial

Obrigado por querer contribuir com o Desk Imperial.

Este é um projeto open source construído para ajudar pequenos comerciantes brasileiros.
Toda contribuição — código, documentação, bug report ou sugestão — é bem-vinda.

---

## Antes de começar

1. Leia o [README.md](./README.md) para entender o projeto
2. Leia [docs/product/overview.md](./docs/product/overview.md) para entender para quem o produto é feito
3. Leia [docs/architecture/modules.md](./docs/architecture/modules.md) para entender a estrutura
4. Configure o ambiente local: [docs/architecture/local-development.md](./docs/architecture/local-development.md)

---

## Tipos de contribuição

### Bug reports

Encontrou algo que não funciona? Abra uma issue com:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs. comportamento atual
- Versão do Node.js e sistema operacional
- Logs relevantes (sem credenciais)

### Sugestões e funcionalidades

Abra uma issue descrevendo:

- O problema que a funcionalidade resolveria
- Para qual tipo de usuário (dono, funcionário, desenvolvedor)
- Proposta de solução (se tiver)

Não abra PR com funcionalidade nova sem issue aprovada antes. Isso evita trabalho desperdiçado.

### Correções de documentação

PRs de documentação são bem-vindos sem issue prévia. Só garanta que:

- O texto é claro e direto
- Não inventa funcionalidade que não existe
- Segue o tom dos outros documentos

### Correções de código

- Bugs confirmados: abra PR diretamente referenciando a issue
- Refatorações: discuta na issue antes de implementar
- Segurança: **não abra issue pública** — leia [SECURITY.md](./SECURITY.md)

---

## Fluxo de contribuição

```
fork → branch → commit → PR → revisão → merge
```

### 1. Fork e branch

```bash
git fork https://github.com/Victorzinn704/nextjs-boilerplate
git checkout -b tipo/descricao-curta
```

Exemplos de nome de branch:

```
fix/comanda-status-not-updating
feat/export-pdf-relatorio
docs/modules-architecture
```

### 2. Configure o ambiente

```bash
npm ci
cp .env.example .env
# Configure as variáveis mínimas (veja README.md)
npm run db:up
npm --workspace @partner/api run prisma:generate
npm --workspace @partner/api run prisma:migrate:dev
npm run seed
```

### 3. Faça as mudanças

- Escreva código claro e direto
- Adicione testes para o que foi alterado
- Não misture refatoração com feature na mesma branch
- Não adicione dependências novas sem discutir antes

### 4. Verifique antes de abrir PR

```bash
npm run lint          # Zero erros
npm run typecheck     # Zero erros
npm run test          # Todos os testes passando
npm run build         # Build sem falha
```

Se algum desses falhar, corrija antes de abrir o PR.

### 5. Abra o PR

Use o template disponível em `.github/pull_request_template.md`.

Inclua no PR:

- O problema que resolve (link da issue se houver)
- O que foi mudado
- Como testar
- Checklist preenchido

---

## Padrões de código

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo): descrição curta

Corpo opcional explicando o porquê.
```

Tipos aceitos:

| Tipo       | Quando usar                         |
| ---------- | ----------------------------------- |
| `feat`     | Nova funcionalidade                 |
| `fix`      | Correção de bug                     |
| `docs`     | Documentação                        |
| `refactor` | Refatoração sem mudar comportamento |
| `test`     | Testes                              |
| `chore`    | Tarefas de manutenção               |
| `perf`     | Melhoria de performance             |

### TypeScript

- Sem `any` explícito sem justificativa
- Tipos compartilhados API ↔ frontend vão em `packages/types/src/contracts.ts`
- DTOs do backend usam `class-validator`

### Backend (NestJS)

- Cada módulo tem responsabilidade única e clara
- Services injetam `CacheService` e `PrismaService` quando necessário
- Toda query filtra por `companyOwnerId` — nunca expor dados de outro workspace
- Mutações invalidam o cache relevante

### Frontend (Next.js)

- Componentes organizados por domínio em `apps/web/components/`
- Contratos de API em `apps/web/lib/api.ts`
- Validação com Zod
- Nenhum dado sensível em `localStorage` (apenas estado de UI)

### Testes

- Testes unitários de backend em `apps/api/test/`
- Testes E2E de frontend em `apps/web/e2e/`
- Nomes descritivos: `deve fazer X quando Y`
- Mocks apenas onde necessário — preferir testes com comportamento real

---

## O que não aceitamos

- Código que vaze dados entre workspaces
- Dependências com licença incompatível com MIT
- Funcionalidades que não se encaixam no público-alvo (pequeno comerciante brasileiro)
- PRs sem testes para código de negócio novo
- Commits com credenciais, chaves ou tokens

---

## Dúvidas

Abra uma issue com a tag `question`. Toda pergunta é bem-vinda.

Se você está começando no desenvolvimento e não sabe por onde ir, leia [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md).
