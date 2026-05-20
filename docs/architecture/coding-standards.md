# Coding Standards — Desk Imperial

> **Regra de ouro**: Se o código em um arquivo novo destoa do padrão aqui descrito, o PR é rejeitado.
> **Segunda regra**: Se o código existente viola este padrão, abra um PR de refatoração separado — nunca misture refatoração com feature.

---

## 1. Nomenclatura

| Elemento                                | Convenção                                         | Exemplo                                          |
| --------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Arquivos `.ts` (serviços, utils, types) | `kebab-case`                                      | `auth.service.ts`, `document-validation.util.ts` |
| Arquivos `.tsx` (componentes React)     | `kebab-case`                                      | `dashboard-shell.tsx`, `pdv-comanda-modal.tsx`   |
| Arquivos de teste                       | `*.spec.ts` (API) / `*.test.ts` (Web)             | `auth.service.spec.ts`, `validation.test.ts`     |
| Classes / Componentes React             | `PascalCase`                                      | `AuthService`, `DashboardShell`                  |
| Funções / Variáveis                     | `camelCase`                                       | `getUserById`, `isComandaOpen`                   |
| Constantes (valores imutáveis)          | `UPPER_SNAKE_CASE`                                | `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`        |
| Interfaces / Types                      | `PascalCase`                                      | `CreateOrderDto`, `ComandaRecord`                |
| Enums                                   | `PascalCase` (nome), `UPPER_SNAKE_CASE` (valores) | `OrderStatus.PENDING`                            |
| Pastas de módulo                        | `kebab-case`                                      | `modules/admin-pin/`, `components/dashboard/`    |
| Pastas internas de módulo               | `kebab-case`                                      | `dto/`, `guards/`, `decorators/`, `hooks/`       |

### Sufixos de arquivo

| Sufixo           | Uso                                                              |
| ---------------- | ---------------------------------------------------------------- |
| `.service.ts`    | Serviço NestJS (injetável, com lógica de negócio)                |
| `.controller.ts` | Controller NestJS (rotas, validação de entrada)                  |
| `.module.ts`     | Módulo NestJS (provedores, imports, exports)                     |
| `.guard.ts`      | Guard NestJS (autorização, proteção de rota)                     |
| `.util.ts`       | Utilitário puro (funções sem estado, sem dependências injetadas) |
| `.utils.ts`      | **PROIBIDO** — usar `.util.ts` no singular sempre                |
| `.types.ts`      | Tipos e interfaces TypeScript                                    |
| `.constants.ts`  | Constantes do módulo                                             |
| `.dto.ts`        | Data Transfer Objects (class-validator)                          |
| `.filter.ts`     | Exception filters NestJS                                         |
| `.decorator.ts`  | Custom decorators NestJS                                         |
| `.gateway.ts`    | Socket.IO gateway                                                |
| `.template.ts`   | Templates (email, etc.)                                          |
| `.config.ts`     | Configuração de módulo                                           |
| `.adapter.ts`    | Adapter entre interfaces diferentes                              |
| `.publisher.ts`  | Publicador de eventos (Socket.IO, Redis, etc.)                   |
| `.resolver.ts`   | Resolvedor de contexto (ex: session resolver)                    |

---

## 2. Estrutura de Arquivos

### API — Módulo padrão

```
src/modules/nome-do-modulo/
  nome-do-modulo.module.ts          # Módulo (obrigatório)
  nome-do-modulo.controller.ts      # Controller (se expõe HTTP)
  nome-do-modulo.service.ts         # Serviço principal (se ≤ 300 linhas)
  nome-do-modulo.types.ts           # Tipos internos do módulo
  nome-do-modulo.constants.ts       # Constantes do módulo
  dto/
    create-xxx.dto.ts
    update-xxx.dto.ts
    xxx-query.dto.ts
  guards/
    xxx.guard.ts
  decorators/
    xxx.decorator.ts
  utils/
    xxx-helper.util.ts              # Funções puras, sem dependências injetadas
```

### Regra de divisão de arquivos

- **Máximo 300 linhas** por arquivo (warn em ESLint)
- **Máximo 50 linhas** por função (warn em ESLint)
- **Máximo 4 níveis** de aninhamento (error em ESLint)
- **Máximo 4 parâmetros** por função (error em ESLint)

Quando um serviço ultrapassa 300 linhas:

```
# ANTES (ruim):
operations.service.ts          # 847 linhas — faz tudo

# DEPOIS (bom):
operations/
  operations.service.ts        # ~120 linhas — orquestrador
  comanda.service.ts           # ~200 linhas — gestão de comandas
  cash-session.service.ts      # ~200 linhas — sessão de caixa
  order-lifecycle.service.ts   # ~200 linhas — fluxo de pedidos
  realtime-publisher.service.ts # ~100 linhas — publicação de eventos
```

### Web — Componente padrão

```
components/nome-do-modulo/
  nome-do-componente.tsx        # Componente principal
  nome-do-componente.test.tsx   # Testes
  hooks/
    use-nome-do-hook.ts         # Hooks relacionados
    use-nome-do-hook.test.ts
  utils/
    nome-do-util.util.ts        # Funções auxiliares puras
```

---

## 3. Organização de Imports

**Ordem obrigatória** (separados por linha em branco):

```typescript
// 1. Node.js built-ins
import path from 'node:path'

// 2. External packages (npm)
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@prisma/client'

// 3. Internal aliases (@/) ou relative imports de módulos internos
import { CacheService } from '@/common/services/cache.service'
import { ComandaRecord } from '@contracts/contracts'

// 4. Relative imports (mesmo módulo)
import { CreateComandaDto } from './dto/create-comanda.dto'
import { formatComandaTotal } from './utils/comanda-format.util'
```

**Regras:**

- API usa imports relativos (`../../common/...`) — **migrar para aliases quando possível**
- Web usa alias `@/` para tudo dentro de `apps/web/`
- Tipos compartilhados sempre via `@contracts/contracts` (packages/types)
- **Nunca** misturar imports relativos e aliases para o mesmo destino
- Imports de tipos usam `import type` (forçado por ESLint `consistent-type-imports`)

---

## 4. Error Handling

### API (NestJS)

```typescript
// BOM: Usar HttpException ou subclasses
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class ComandaService {
  async findById(id: string) {
    const comanda = await this.prisma.comanda.findUnique({ where: { id } });
    if (!comanda) {
      throw new NotFoundException(`Comanda ${id} não encontrada`);
    }
    return comanda;
  }
}

// BOM: HttpExceptionFilter global já formata a resposta
// Ver: common/filters/http-exception.filter.ts

// RUIM: console.error sem tratamento
catch (error) {
  console.error(error); // ❌ swallowed error
}

// BOM: Logger do NestJS + rethrow ou exception
catch (error) {
  this.logger.error(`Falha ao criar comanda`, error instanceof Error ? error.stack : String(error));
  throw new BadRequestException('Falha ao criar comanda');
}
```

### Web (React)

```typescript
// BOM: Error boundaries + toast notifications
// BOM: React Query já trata erros de API automaticamente
// BOM: Zod para validação de formulário com mensagens claras

// RUIM: try/catch vazio em hooks
useEffect(() => {
  fetchData().catch(() => {}) // ❌ swallowed error
}, [])

// BOM: Log + feedback ao usuário
useEffect(() => {
  fetchData().catch((error) => {
    faro.api.pushError(error)
    toast.error('Falha ao carregar dados')
  })
}, [])
```

---

## 5. Tipos e Interfaces

### Regras gerais

- **Nunca usar `any`** — usar `unknown` + type guard ou tipo específico
- **Sempre usar `import type`** para tipos (forçado por ESLint)
- **Tipos compartilhados** entre API e Web ficam em `packages/types/src/contracts.ts`
- **Tipos internos** de módulo ficam em `nome-do-modulo.types.ts`
- **DTOs** usam `class-validator` (API) ou `Zod` (Web)

### DTO (API)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsNumber()
  @IsOptional()
  price?: number
}
```

### Schema (Web)

```typescript
import { z } from 'zod'

export const productFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser positivo').optional(),
})

export type ProductFormData = z.infer<typeof productFormSchema>
```

---

## 6. Testes

### API (Jest)

```typescript
// Nome do arquivo: nome-do.service.spec.ts
// Localização: apps/api/test/modules/nome-do-modulo/

describe('NomeDoService', () => {
  let service: NomeDoService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [NomeDoService, MockPrismaService],
    }).compile()
    service = module.get(NomeDoService)
  })

  it('deve criar um registro quando dados válidos', async () => {
    // arrange
    // act
    // assert
  })

  it('deve lançar NotFoundException quando não encontrar', async () => {
    // arrange
    // act + assert
  })
})
```

### Web (Vitest + Testing Library)

```typescript
// Nome do arquivo: nome-do-componente.test.tsx
// Localização: apps/web/components/nome-do-modulo/

import { render, screen } from '@testing-library/react';
import { NomeDoComponente } from './nome-do-componente';

describe('NomeDoComponente', () => {
  it('deve renderizar o título corretamente', () => {
    render(<NomeDoComponente />);
    expect(screen.getByRole('heading', { name: /título/i })).toBeInTheDocument();
  });
});
```

---

## 7. Commits

### Convenção (Conventional Commits)

```
<tipo>(<escopo>): <descrição curta>

<corpo opcional>
```

| Tipo       | Uso                                      |
| ---------- | ---------------------------------------- |
| `feat`     | Nova funcionalidade                      |
| `fix`      | Correção de bug                          |
| `refactor` | Refatoração sem mudança de comportamento |
| `style`    | Formatação, lint, sem mudança de lógica  |
| `test`     | Adição ou correção de testes             |
| `docs`     | Documentação                             |
| `chore`    | Manutenção (deps, config, CI)            |
| `perf`     | Melhoria de performance                  |
| `ci`       | Mudança no CI/CD                         |

**Escopos válidos:** `api`, `web`, `types`, `infra`, `ci`, `deps`

**Exemplos:**

```
feat(api): adicionar endpoint de relatórios financeiros
fix(web): corrigir formatação de moeda no PDV
refactor(api): dividir auth.service em módulos menores
style(web): organizar imports e formatar com Prettier
test(api): adicionar testes de CSRF guard
chore(deps): atualizar NestJS para v11
```

---

## 8. Segurança

- **Nunca** commitar `.env` com valores reais
- **Nunca** usar `console.log` em produção (API) — usar `Logger` do NestJS
- **Nunca** logar senhas, tokens, PII
- **Sempre** validar entrada no servidor (class-validator / Zod)
- **Sempre** usar `HttpOnly` + `Secure` cookies para sessão
- **Sempre** verificar CSRF em mutations
- **Sempre** verificar autorização em rotas protegidas (guards)

---

## 9. Performance

### API

- Usar `select` em vez de `include` quando não precisa de todos os campos
- Paginar todas as listas (limit/offset ou cursor)
- Cache Redis para dados frequentemente acessados
- Índices no Prisma para colunas de busca frequente

### Web

- Code split por rota (Next.js faz automaticamente)
- `dynamic()` para componentes pesados (Leaflet, AG Grid)
- Memoizar componentes caros com `React.memo`
- Usar React Query cache — evitar refetch desnecessário

---

## 10. O que NÃO fazer

- [ ] Criar arquivos com mais de 300 linhas sem justificativa
- [ ] Usar `any` sem comentário explicando o porquê
- [ ] Misturar lógica de negócio em controllers
- [ ] Misturar UI com lógica de negócio em componentes
- [ ] Usar `console.log` na API (use `Logger`)
- [ ] Criar novos sufixos de arquivo além dos listados na Seção 1
- [ ] Duplicar código entre API e Web (extrair para `@partner/shared-utils`)
- [ ] Commitar sem rodar `npm run lint && npm run typecheck`
- [ ] Misturar refatoração com feature no mesmo PR
- [ ] Usar `.utils.ts` — sempre `.util.ts` (singular)
