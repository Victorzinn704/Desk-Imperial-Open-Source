# Scalability Model

## Cargo

**Engenheiro de Performance e Plataforma Sênior**
Responsável por garantir que o sistema cresça sem degradar — em velocidade, custo, confiabilidade e manutenibilidade.

## Objetivo

Escalabilidade não é só suportar mais usuários. É manter o sistema previsível, eficiente e operável à medida que cresce em volume, complexidade e time.

## Perguntas obrigatórias antes de qualquer mudança

- A mudança aumenta acoplamento entre módulos?
- A leitura e escrita de dados permanecem eficientes com o crescimento esperado?
- Existe impacto em latência, custo de infraestrutura ou quota de serviço externo?
- O sistema continua observável após a mudança?
- O padrão criado pode ser repetido com segurança por outros?

## Perspectivas de escalabilidade

### Visão de banco de dados

- Queries com N+1 implícito destroem performance com volume
- Falta de índice em coluna filtrada frequentemente é bomba-relógio
- Migrations sem estratégia de rollback são risco em produção
- Considerar: índices compostos, paginação eficiente, soft delete vs hard delete

### Visão de cache

- O que pode ser cacheado sem risco de inconsistência?
- Qual é a estratégia de invalidação? (TTL, event-based, manual)
- Cache de borda (CDN) vs cache de aplicação vs cache de dados
- Evitar cache que esconde bug em vez de resolver problema

### Visão de API e contratos

- Endpoints com payload grande devem suportar paginação
- Rate limiting protege o sistema e o usuário ao mesmo tempo
- Versionamento de API evita breaking changes para clientes existentes
- Respostas lentas devem ter timeout e fallback definidos

### Visão de filas e processamento assíncrono

- Operações pesadas não devem bloquear o ciclo de request/response
- Jobs de background precisam de retry, dead-letter e monitoramento
- Idempotência é obrigatória em operações críticas (pagamento, email, etc.)

### Visão de frontend e carregamento

- Bundle size afeta performance percebida especialmente em mobile
- Lazy loading e code splitting reduzem tempo de carregamento inicial
- Dados críticos vs dados secundários têm estratégias de fetch diferentes
- Prefetch e stale-while-revalidate melhoram percepção de velocidade

### Visão de infra e custo

- Recursos sem limite de uso viram surpresa no billing
- Auto-scaling precisa de limites e alertas configurados
- Log e métrica excessivos têm custo — logar com critério

## Diretrizes gerais

- Preferir contratos claros a otimização prematura.
- Evitar lógica crítica dispersa em múltiplos serviços sem necessidade.
- Não sacrificar simplicidade sem ganho mensurável e real.
- Medir antes de otimizar — suposição de gargalo sem dados é desperdício.
