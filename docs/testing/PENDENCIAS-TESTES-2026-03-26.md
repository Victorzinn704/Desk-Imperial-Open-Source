# Pendências de Testes — Encerradas

**Data:** 26 de março de 2026
**Status:** Correções aplicadas, validadas e suíte consolidada ✅

---

## Panorama

| Suíte                       | Falhas iniciais (histórico) | Status                  |
| --------------------------- | --------------------------- | ----------------------- |
| `admin-pin.service.spec.ts` | ~8                          | Corrigido e validado ✅ |
| `products.service.spec.ts`  | ~10                         | Corrigido e validado ✅ |
| `orders.service.spec.ts`    | ~15                         | Corrigido e validado ✅ |
| `employees.service.spec.ts` | ~20                         | Corrigido e validado ✅ |
| `cache.service.spec.ts`     | 0                           | Passou — sem pendência  |

Todos os arquivos críticos foram atualizados e executados com sucesso.

---

## Resultado da execução

Comando executado em `apps/api`:

```bash
npm test -- test/products.service.spec.ts test/employees.service.spec.ts test/orders.service.spec.ts test/admin-pin.service.spec.ts
```

Resultado:

- **Test Suites:** 4 passed, 4 total
- **Tests:** 103 passed, 103 total

---

## Correções aplicadas

### `products.service.spec.ts`

- Ajuste dos cenários de cache para query sem `limit` explícito (cache hit/set).
- Chaves de cache corrigidas para `products:list:*`.
- Mock de conflito ajustado para `PrismaClientKnownRequestError` real (P2002).
- CSVs de teste atualizados para headers esperados pelo parser (incluindo `description`).
- Expectativas de importação ajustadas para o comportamento real: erros por linha retornam em `result.errors`.

### `employees.service.spec.ts`

- Isolamento de testes corrigido com `jest.resetAllMocks()`.
- Mock padrão de `$transaction` adicionado para fluxos de update/create.
- Chaves de cache corrigidas para `employees:list:*`.
- Mensagens de erro alinhadas ao service (`listar e gerenciar`).
- Expectativa de email de login alinhada ao padrão real `staff.<owner>.<code>@login.deskimperial.internal`.
- Cenário de HTML ajustado para `BadRequestException`.
- Conflito P2002 ajustado com prototype de erro Prisma.

### `orders.service.spec.ts`

- Factory `makeOrder` atualizada com `updatedAt` e `cancelledAt`.
- Factory de item (`makeOrderItem`) adicionada para shape completo usado em `toOrderRecord`.
- Mock de `$transaction` adicionado.
- Defaults de `updateMany` adicionados para evitar `count` indefinido.
- Chaves de cache corrigidas para `orders:summary:*`.
- CPF válido ajustado para `52998224725`.
- Testes com item único ajustados para evitar `NotFoundException` indevida quando apenas `product-1` está mockado.

### `admin-pin.service.spec.ts`

- `extractVerificationProof` ajustado para leitura de cookie (`partner_admin_pin`) e retorno `string | null`.
- Removido bloco de teste de método inexistente (`clearVerificationChallenge`).
- `validateVerificationProof` ajustado para receber `proof` como string.
- Chaves de rate limit/challenge alinhadas com `admin-pin` e `admin-pin-proof`.
- Casos de fingerprint/session/challenge alinhados ao fluxo real de validação.

---

## `products.service.spec.ts`

### Problema 1 — Cache não verifica quando `limit: 20`

`makeListProductsQueryDto()` retorna `{ limit: 20 }`. O service só verifica cache quando `!hasFilters && !query.limit`. Com `limit: 20`, o cache nunca é checado.

**Fix:** Passar `{}` em vez de `makeListProductsQueryDto()` nos testes de cache (hit e set).

### Problema 2 — Chave de cache errada

O teste espera `'products:user-1'` mas `CacheService.productsKey()` retorna `'products:list:user-1'`.

**Fix:** Trocar todas as ocorrências `'products:user-1'` → `'products:list:user-1'` e `'products:user-123'` → `'products:list:user-123'`.

### Problema 3 — ConflictException não dispara

O service usa `instanceof Prisma.PrismaClientKnownRequestError`. Um `new Error()` com `.code = 'P2002'` não passa essa verificação.

**Fix:**

```typescript
import { Prisma } from '@prisma/client' // adicionar ao import existente

function makePrismaUniqueError() {
  const error = new Error('Unique constraint failed')
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype)
  ;(error as any).code = 'P2002'
  return error
}
```

Usar `makePrismaUniqueError()` no teste de ConflictException.

### Problema 4 — CSV com headers em português

O parser exige headers em inglês: `name`, `category`, `description`, `unitcost`, `unitprice`, + `stock` (ou `stockpackages`/`stocklooseunits`).

**Fix:** Trocar `validCsvContent` e todos os CSVs inline dos testes:

```
// ANTES (português)
nome,categoria,classe_cadastro,unidade_medida,...

// DEPOIS (inglês)
name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,unitCost,unitPrice,currency,stock
```

Também ajustar `expect(...).toContain('nome')` → `'name'` nos erros de validação.

---

## `employees.service.spec.ts`

### Problema 1 — `jest.clearAllMocks()` não limpa implementações

O teste de ConflictException usa `$transaction` com `.mockRejectedValue(...)`. Essa implementação vaza para os testes de `updateForUser` porque `clearAllMocks` só limpa contadores, não implementações.

**Fix:** Trocar `jest.clearAllMocks()` → `jest.resetAllMocks()` no `beforeEach` e readicionar os defaults após o reset. Adicionar mock de `$transaction` nos testes de `updateForUser`.

### Problema 2 — Chave de cache errada

`'employees:owner-1'` → `'employees:list:owner-1'`
`'employees:owner-123'` → `'employees:list:owner-123'`

### Problema 3 — Mensagens de erro trocadas

| O teste espera                                | O service retorna                                                 |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `'Apenas o dono pode cadastrar funcionarios'` | `'Apenas o dono pode listar e gerenciar funcionarios.'` (no list) |

Verificar cada mensagem na listagem vs criação vs edição.

### Problema 4 — Email de login

O teste espera `stringContaining('func002@')`. O service gera `'staff.owner-1.002@login.deskimperial.internal'`.

**Fix:** Ajustar expectativa para `expect.stringContaining('staff.owner-1.002@login.deskimperial.internal')`.

### Problema 5 — Sanitização de HTML

O teste espera que HTML seja sanitizado. O service lança `BadRequestException` em vez de sanitizar silenciosamente.

**Fix:** Mudar expectativa para `rejects.toThrow(BadRequestException)`.

### Problema 6 — ConflictException (mesmo do products)

Usar `Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype)`.

### Problema 7 — Factory `makeEmployee()` no teste de audit log

O factory retorna dados diferentes do DTO usado no teste. Corrigir factory ou passar overrides `{ employeeCode: '002', displayName: 'Novo Funcionário' }`.

---

## `orders.service.spec.ts`

### Problema 1 — `makeOrder()` sem `updatedAt`

`toOrderRecord` chama `order.updatedAt.toISOString()`. O factory não tem esse campo → TypeError.

**Fix:**

```typescript
function makeOrder(overrides = {}) {
  return {
    // ...campos existentes...
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    cancelledAt: null,
    ...overrides,
  }
}
```

### Problema 2 — Chave de cache errada

`'orders:user-1'` → `'orders:summary:user-1'`
`'orders:user-123'` → `'orders:summary:user-123'`

### Problema 3 — CPF inválido nos testes

`'12345678900'` não passa o algoritmo real de CPF.

**Fix:** Usar `'52998224725'` (CPF válido real).

### Problema 4 — Testes com dois produtos quando só um está mockado

Vários testes usam `makeCreateOrderDto()` que tem `items: [product-1, product-2]`. O mock de `findMany` só retorna `product-1`. O service lança `NotFoundException` antes de chegar na validação que o teste quer testar.

**Fix nos testes afetados:** Usar `items: [{ productId: 'product-1', quantity: 2 }]` (só product-1) + mock retornando `[makeProduct({ id: 'product-1' })]`.

### Problema 5 — Cache: `listForUser` com `{ limit: 10 }` não faz cache

O service só faz cache quando `!hasFilters` e `!includeCancelled` e `limit === 10` (default). Verificar a condição exata e ajustar os testes.

---

## `admin-pin.service.spec.ts`

### Problema 1 — `extractVerificationProof` lê cookies, não Authorization header

O service lê `request.cookies['partner_admin_pin']` e retorna `string | null`.

O teste passa `{ headers: { authorization: 'Bearer ...' } }` e espera um objeto `{ challengeId, signature, expiresAt }`.

**Fix:**

```typescript
// ANTES
const mockRequest = { headers: { authorization: 'Bearer challenge-123.signature' } }
expect(result).toEqual({ challengeId: 'challenge-123', ... })

// DEPOIS
const mockRequest = { cookies: { 'partner_admin_pin': 'challenge-123' } }
expect(result).toBe('challenge-123')  // string, não objeto
```

Casos de `null`: passar `{ cookies: {} }`.

### Problema 2 — `clearVerificationChallenge` não existe

O método não existe no service. Remover o `describe('clearVerificationChallenge')` inteiro.

### Problema 3 — `validateVerificationProof` recebe string, não objeto

A assinatura é `validateVerificationProof(auth, proof?: string | null)`.

Os testes passam `{ challengeId, signature, expiresAt }` como proof.

**Fix:** Passar `'challenge-123'` (string) como proof. Ajustar o mock de `cache.get` para retornar o challenge salvo.

### Problema 4 — `issueVerificationChallenge` chave de cache

O service usa `ratelimitKey('admin-pin-proof', ...)` internamente. O teste espera `expect.stringContaining('admin-pin-challenge')`. Verificar o nome exato da chave no service e ajustar.

---

## Consolidação final

Suíte completa da API validada após as correções:

- **Test Suites:** 13 passed, 13 total
- **Tests:** 337 passed, 337 total
