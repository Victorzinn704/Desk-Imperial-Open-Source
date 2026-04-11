# Backend Review - Desk Imperial

## Resumo do Domínio
Backend NestJS + Prisma + Redis, com autenticação por sessão/cookie, CSRF por double-submit, fluxos de `orders`, `products`, `finance`, `operations`, `employees` e `admin-pin`. O desenho geral mostra boa cobertura de testes e uso consistente de transações em rotas críticas, mas encontrei pontos reais de integridade de dados, autorização e cache que ainda podem vazar estado ou produzir respostas monetárias erradas.

Não encontrei jobs/cron no escopo analisado.

## Principais Riscos
- Sessões de `STAFF` podem continuar válidas após arquivamento do funcionário, porque o estado de `User.status` muda sem revogação da sessão nem invalidação do cache de auth.
- Mudanças de `preferredCurrency` não limpam caches monetários de `products`, `orders`, `finance` e `pillars`, então o usuário pode ver valores e moedas antigos até expirar o TTL.
- O cancelamento de pedido não é idempotente e não usa isolamento forte; duas requisições concorrentes podem restaurar estoque duas vezes.
- O cálculo semanal de `pillars` começa no domingo, o que distorce KPI semanal em contexto comercial.
- O resumo financeiro ainda pode crescer demais em tenants grandes, porque alguns `groupBy` vêm sem limite e o corte acontece só em memória.

## Achados Detalhados

### 1) Sessões de funcionário arquivado continuam válidas por cache
- Severidade: Alto
- Fato confirmado: `validateSessionToken()` devolve `cached.auth` sem consultar o banco quando há cache hit, e o cache de sessão vive por até 300 segundos. Ver [auth.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1301) e [auth.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1508).
- Fato confirmado: ao arquivar/restaurar funcionário, o backend atualiza `User.status` dentro da transação, mas a invalidação pós-write visível é só do cache de empregados. Ver [employees.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/employees/employees.service.ts:211) e [employees.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/employees/employees.service.ts:238).
- Inferência forte: um `STAFF` arquivado pode continuar autenticado e operando por até o TTL do cache, mesmo depois de o banco marcar o usuário como `DISABLED`.
- Impacto: autorização indevida após desativação; o efeito é curto, mas real, e atinge uma conta que já foi explicitamente revogada.
- Confiança: Alta.
- Recomendação concreta: ao mudar `User.status` para `DISABLED`, revogar todas as sessões ligadas ao `loginUserId`, limpar `auth:session:*` e, se possível, impedir o cache-hit sem revalidação para sessões de usuários recentemente desativados.

### 2) Mudança de moeda preferida não invalida caches monetários
- Severidade: Médio
- Fato confirmado: `updateProfile()` grava `preferredCurrency` e só chama `forgetSessionCache()`. Ver [auth.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1403) e [auth.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1438).
- Fato confirmado: os caches de `products`, `orders`, `finance` e `pillars` são indexados por `userId` e/ou um escopo fixo, sem incluir moeda. Ver [products.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.service.ts:65), [orders.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:108), [finance.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance.service.ts:69) e [pillars.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:58).
- Inferência forte: depois que o usuário troca a moeda no perfil, respostas cacheadas podem continuar mostrando valores em moeda antiga até um write path diferente limpar o cache ou o TTL expirar.
- Impacto: dashboard financeiro, listagem de produtos e pedidos podem exibir moeda e totais inconsistentes com o perfil atual.
- Confiança: Alta.
- Recomendação concreta: incluir `preferredCurrency` no cache key dessas respostas ou invalidar explicitamente os caches monetários em `updateProfile()`.

### 3) Cancelamento de pedido pode restaurar estoque duas vezes sob concorrência
- Severidade: Alto
- Fato confirmado: `cancelForUser()` lê o pedido antes da transação, valida `order.status`, e dentro da transação faz `updateMany()` para incrementar estoque e depois atualiza o pedido sem condição de status. Ver [orders.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:494), [orders.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:511), [orders.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:543) e [orders.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:562).
- Inferência forte: duas requisições concorrentes para o mesmo `orderId` podem ambas passar na leitura inicial e aplicar o restore de estoque, porque a atualização não revalida o estado dentro do `transaction`.
- Impacto: inflação de estoque, quebra de integridade e divergência entre inventário físico e banco.
- Confiança: Alta.
- Recomendação concreta: mover a verificação de status para dentro da transação, usar condição de `status != CANCELLED` no `update`, e tratar `count === 0` como cancelamento já processado; idealmente com isolamento serializável no fluxo de cancelamento também.

### 4) KPI semanal começa no domingo
- Severidade: Médio
- Fato confirmado: `getWeekStart()` usa `Date.getDay()` e subtrai o dia corrente diretamente, o que define domingo como início da semana. Ver [pillars.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:198).
- Fato confirmado: o cálculo de `currentWeekStart` e `previousWeekStart` depende desse helper. Ver [pillars.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:72).
- Inferência forte: para este domínio comercial em português do Brasil, isso tende a distorcer comparações semanais, porque a semana operacional costuma começar na segunda-feira.
- Impacto: números de `weeklyRevenue`, `profit` e tendências podem variar em um dia e produzir leitura errada de performance.
- Confiança: Alta.
- Recomendação concreta: adotar semana ISO (segunda como dia 1) ou tornar o início da semana configurável por workspace/locale.

### 5) Resumo financeiro ainda pode explodir em tenants grandes
- Severidade: Médio
- Fato confirmado: `buildAndCacheSummary()` dispara vários `groupBy()` em paralelo sem `take` para `channelOrders`, `customerOrders`, `employeeOrders` e `geographyOrders`. Ver [finance.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance.service.ts:189) e [finance.service.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance.service.ts:227).
- Fato confirmado: o pós-processamento corta só depois de materializar tudo em memória em alguns casos, como `buildTopCustomers()` e `buildTopEmployees()`, enquanto `buildSalesByChannel()` e `buildSalesMap()` retornam todos os grupos. Ver [finance-analytics.util.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance-analytics.util.ts:166), [finance-analytics.util.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance-analytics.util.ts:226) e [finance-analytics.util.ts](/c:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/finance-analytics.util.ts:369).
- Risco potencial: tenants com muitos clientes/regiões/canais vão pagar mais memória e latência na reconstrução do cache, principalmente após mutações que chamam `invalidateAndWarmSummary()`.
- Impacto: aumento de latência server-side, maior pressão de memória e rebuild caro em cache miss.
- Confiança: Média-Alta.
- Recomendação concreta: limitar cardinalidade no banco quando o objetivo for top-N, reduzir dimensão dos `groupBy` ou trocar por agregação paginada/por janela temporal.

## Leitura de Cobertura
- `packages/types` está sendo usado corretamente para validação compartilhada de documentos CPF/CNPJ; não vi divergência confirmada entre contrato compartilhado e backend nesse ponto.
- Os testes existentes cobrem `session.guard`, `csrf.guard`, `finance.service`, `pillars.service`, `orders.service` e fluxos de auth, mas não encontrei cobertura explícita para arquivamento de funcionário invalidando sessão nem para mudança de `preferredCurrency` limpando caches monetários.

## Conclusão
O backend tem boas bases de segurança e modelagem, mas os riscos que mais merecem atenção agora são revogação/autorização de sessão, invalidação de cache por moeda e concorrência no cancelamento de pedidos. Esses três pontos têm impacto direto em autorização e integridade financeira.
