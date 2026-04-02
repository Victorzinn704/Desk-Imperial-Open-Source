# Gestão de Estoque — Desk Imperial

## Visão geral

O módulo de estoque conecta o portfólio de produtos ao fluxo de vendas do PDV. Quando uma comanda é fechada, o estoque é decrementado automaticamente. Cada produto pode ter um limite de alerta configurável, e o garçom vê a quantidade disponível em tempo real dentro do próprio card de produto.

---

## Funcionalidades implementadas

### 1. Baixa automática ao fechar comanda

**Onde:** `apps/api/src/modules/operations/operations-helpers.service.ts` — `ensureOrderForClosedComanda`

Quando uma comanda é fechada, o sistema executa dentro da mesma transação `SERIALIZABLE`:

1. Agrega a quantidade vendida de cada produto (`productId → totalQty`)
2. Para cada produto, tenta decrementar o estoque com a quantidade vendida
3. Se o estoque for insuficiente (menos unidades do que o vendido), o estoque vai a **zero** — a comanda não é bloqueada

Esse comportamento é intencional: operação tem prioridade sobre precisão de inventário. Se um produto foi vendido sem estoque suficiente, o sistema registra o que tem e continua.

```
Estoque antes: 8
Venda: 12 unidades
Estoque depois: 0  ← não bloqueia, não lança exceção
```

---

### 2. Limite de estoque baixo (`lowStockThreshold`)

**Schema:** `Product.lowStockThreshold Int?` (nullable)

Campo opcional por produto. O dono define o número mínimo de unidades antes de considerar o estoque baixo. Se nulo, nenhum alerta é gerado.

**Exemplos de uso:**
| Produto | Estoque normal | Threshold configurado | Alerta dispara em |
|---|---|---|---|
| Coca-Cola Lata | ~144 und | 20 | ≤ 20 und |
| Hambúrguer artesanal | ~30 und | 5 | ≤ 5 und |
| Produto sem threshold | qualquer | null | nunca |

**Onde é calculado:** `apps/api/src/modules/products/products.types.ts` — `toProductRecord`

```typescript
const isLowStock = product.lowStockThreshold != null && product.stock <= product.lowStockThreshold
```

---

### 3. Alerta no feed de atividade

**Onde:** `apps/api/src/modules/operations/comanda.service.ts` — `checkLowStockAfterClose`

Após cada fechamento de comanda, o sistema consulta os produtos vendidos que têm `lowStockThreshold` configurado. Para cada um que estiver abaixo do limite, registra um evento de auditoria:

```
event: 'product.stock.low'
severity: WARN
metadata: { name, stock, lowStockThreshold }
```

**No frontend** (`apps/web/components/dashboard/activity-timeline.tsx`), esse evento renderiza com ícone `PackageOpen`, cor âmbar `#f59e0b` e mensagem:

> Estoque baixo — Coca-Cola Lata com 18 und — limite configurado: 20 und.

---

### 4. Estoque visível no card do PDV

**Onde:** `apps/web/components/pdv/comanda-modal/components/product-card.tsx`

Cada card de produto exibe a quantidade disponível abaixo do preço, com cor dinâmica:

```
available = product.stock - inCartQty
```

`inCartQty` é a quantidade que o garçom já adicionou nessa comanda na sessão atual — o número mostrado desconta o que já foi reservado.

| Situação | Cor | Texto |
|---|---|---|
| Estoque normal | Cinza (`--text-soft`) | `42 und` |
| `isLowStock = true` ou `available ≤ 5` | Âmbar `#f59e0b` | `3 und` |
| `available ≤ 0` | Vermelho `#f87171` | `Esgotado` |

O garçom nunca fica sem informação: se adicionar 8 de um produto com 10 em estoque, o card muda para `2 und` em âmbar na hora.

---

## Fluxo de dados completo

```
[Produto cadastrado]
  └─ lowStockThreshold definido no formulário (opcional)
       └─ salvo em Product.lowStockThreshold (PostgreSQL)

[PDV — Escolher produto]
  └─ ProductRecord.stock + isLowStock chegam via /products
       └─ SimpleProduct carrega stock e isLowStock
            └─ ProductCard calcula available = stock - inCartQty
                 └─ Exibe cor + quantidade em tempo real

[Fechar comanda]
  └─ ensureOrderForClosedComanda (transação SERIALIZABLE)
       ├─ Cria Order no banco
       ├─ Decrementa Product.stock (mínimo 0)
       └─ checkLowStockAfterClose (async, não bloqueia)
            └─ Para cada produto com threshold atingido:
                 └─ AuditLogService.record(product.stock.low)
                      └─ ActivityTimeline exibe alerta âmbar
```

---

## Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `apps/api/prisma/schema.prisma` | Campo `lowStockThreshold Int?` adicionado ao model `Product` |
| `apps/api/prisma/migrations/20260402000000_*` | Migration SQL para a nova coluna |
| `apps/api/src/modules/products/products.types.ts` | `isLowStock` calculado em `toProductRecord`, exposto em `ProductRecord` |
| `apps/api/src/modules/products/dto/create-product.dto.ts` | Campo `lowStockThreshold` no DTO de criação |
| `apps/api/src/modules/products/dto/update-product.dto.ts` | Campo `lowStockThreshold` no DTO de atualização |
| `apps/api/src/modules/operations/operations-helpers.service.ts` | Baixa de estoque dentro da transação de fechamento |
| `apps/api/src/modules/operations/comanda.service.ts` | `checkLowStockAfterClose` após fechamento |
| `apps/api/src/modules/finance/finance.service.ts` | `lowStockItems` usa `isLowStock` em vez de `stock <= 10` fixo |
| `packages/types/src/contracts.ts` | `lowStockThreshold` e `isLowStock` em `ProductRecord` compartilhado |
| `apps/web/lib/validation.ts` | `lowStockThreshold` no `productSchema` (Zod) |
| `apps/web/lib/api.ts` | `lowStockThreshold` em `ProductPayload` |
| `apps/web/components/dashboard/product-form.tsx` | Campo de input no formulário de produto |
| `apps/web/components/dashboard/environments/portfolio-environment.tsx` | Inclui `lowStockThreshold` no payload de criação/edição |
| `apps/web/components/pdv/comanda-modal/types.ts` | `stock` e `isLowStock` em `SimpleProduct` |
| `apps/web/components/pdv/pdv-board.tsx` | Tipo local `SimpleProduct` atualizado |
| `apps/web/components/dashboard/environments/pdv-environment.tsx` | Mapeamento `ProductRecord → SimpleProduct` inclui stock |
| `apps/web/components/pdv/comanda-modal/components/product-card.tsx` | Indicador visual de estoque no card do PDV |
| `apps/web/components/dashboard/activity-timeline.tsx` | Renderização do evento `product.stock.low` |

---

## Decisões de design

**Por que não bloquear a venda quando o estoque é insuficiente?**
Em um PDV real, bloquear uma venda no momento do fechamento causaria fricção operacional. O operador pode ter combinado a venda verbalmente antes de fechar a comanda. A regra é: a operação tem precedência, o estoque vai a zero e o alerta é gerado para o dono corrigir o inventário depois.

**Por que `lowStockThreshold` é por produto e não global?**
Produtos têm velocidades de giro completamente diferentes. 20 unidades de Coca-Cola Lata pode ser normal; 20 unidades de um insumo raro pode ser crítico. Um threshold global seria inútil ou geraria alertas em excesso.

**Por que `available = stock - inCartQty` no card?**
O garçom precisa saber o que sobrou *considerando o que ele mesmo já adicionou na mesa*. Mostrar o estoque bruto seria enganoso: o card mostraria 10 und disponíveis mesmo depois de ele já ter adicionado 10 na comanda.
