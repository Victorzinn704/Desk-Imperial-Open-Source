# Guia de Refatoração do Dashboard Shell

## Objetivo

Reduzir a complexidade do `dashboard-shell.tsx` (1236 linhas) para melhor manutenção, testabilidade e escalabilidade.

## Estratégia

Dividir o componente monolítico em componentes menores e reutilizáveis, mantendo compatibilidade com a estrutura existente.

## Hooks Criados

- `useDashboardQueries` - Centraliza todas as queries do React Query
- `useDashboardMutations` - Centraliza todas as mutations e invalidações

## Benefícios

- ✅ Reduz o tamanho do dashboard-shell.tsx
- ✅ Facilita testes unitários de queries e mutations
- ✅ Evita duplicação de código
- ✅ Permite reutilizar hooks em outros componentes

## Como Usar nos Hooks

### Antes (no dashboard-shell.tsx)

```typescript
const sessionQuery = useQuery={{ queryKey: ['auth', 'me'], queryFn: fetchCurrentUser, retry: false }}
const consentQuery = useQuery({ queryKey: ['consent', 'me'], queryFn: fetchConsentOverview, enabled: !!sessionQuery.data?.user.userId, ...})
// ... 40+ linhas de queries
```

### Depois (usando o hook)

```typescript
import { useDashboardQueries, useDashboardMutations } from './hooks'

export function DashboardShell() {
  const { sessionQuery, consentQuery, productsQuery, ordersQuery, employeesQuery, financeQuery } = useDashboardQueries()
  const { createProductMutation, logoutMutation, ... } = useDashboardMutations()

  // ... resto do código
}
```

## Próximos Passos Recomendados

### Phase 2: Extrair Componentes de Seção

Mover `OverviewEnvironment`, `SalesEnvironment`, `PortfolioEnvironment` e `ComplianceEnvironment` para arquivos separados:

```
dashboard/
├── dashboard-shell.tsx (componente pai, <200 linhas)
├── environments/
│   ├── overview-environment.tsx
│   ├── sales-environment.tsx
│   ├── portfolio-environment.tsx
│   └── compliance-environment.tsx
├── hooks/
│   ├── useDashboardQueries.ts ✅ CRIADO
│   ├── useDashboardMutations.ts ✅ CRIADO
│   └── index.ts ✅ CRIADO
└── ... (outros componentes)
```

### Phase 3: Extrair Componentes de Card/Formulário

Crear componentes separados para cards complexos:

- `AccountProfileCard` - já existe, reutilizar
- `FinanceOverviewCard` - novo
- `EmployeeManagementCard` - já existe, revisar tamanho

## Métricas de Sucesso

- [ ] dashboard-shell.tsx < 250 linhas
- [ ] Cada environment component < 300 linhas
- [ ] 100% das queries em `useDashboardQueries`
- [ ] 100% das mutations em `useDashboardMutations`
- [ ] Testes unitários para hooks

## Notas Importantes

- Os hooks são TypeScript puro, fáceis de testar com `vitest` ou `jest`
- A refatoração pode ser feita incrementalmente
- Não quebrará a funcionalidade existente
- Mantém compatibilidade com React 18 e Next.js 14+
