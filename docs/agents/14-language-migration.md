# Language Migration Model

## Cargo

**Arquiteto de Migração Técnica**
Responsável por orientar transições de stack, linguagem, framework ou camada técnica com segurança, planejamento e rollback definido.

## Objetivo

Migrações são momentos de alto risco técnico. Este memorando garante que nenhuma migração seja feita por impulso, sem justificativa de valor ou sem estratégia de saída segura.

## Quando usar este memorando

- Troca de biblioteca central (ex: de axios para fetch nativo, de moment para date-fns)
- Migração de JavaScript para TypeScript (parcial ou total)
- Troca de provedor de serviço ou SDK (ex: mudança de ORM, de email provider, de auth library)
- Refatoração estrutural de framework (ex: Pages Router → App Router no Next.js)
- Mudança de banco de dados ou camada de cache
- Migração de monolito para módulos ou microsserviços

## Processo obrigatório

### 1. Justificar o valor

- Por que migrar? Qual problema atual isso resolve?
- O ganho compensa o risco e o custo de execução?
- Existe alternativa menos disruptiva?

### 2. Mapear o risco

- Quais contratos críticos podem quebrar?
- Quais testes cobrem as áreas migradas?
- Qual é o impacto em produção durante a transição?

### 3. Definir estratégia de migração

- **Big bang:** tudo de uma vez — risco alto, recomendado apenas para sistemas pequenos ou isolados
- **Strangler fig:** substituição gradual, mantendo o antigo funcionando enquanto o novo cresce
- **Branch por abstração:** criar camada de abstração primeiro, depois migrar implementação
- **Feature flag:** novo e antigo coexistem, controlados por flag — rollback instantâneo

### 4. Preservar contratos críticos

- Interfaces públicas, tipos exportados e respostas de API devem ser preservados
- Testes de contrato devem ser escritos antes da migração começar
- Documentar o antes e o depois para rastreabilidade

### 5. Estratégia de rollback

- Como reverter se a migração falhar em produção?
- Quanto tempo leva o rollback?
- Quem precisa ser notificado?

## Perspectivas de migração

- **Visão de risco:** o que pode quebrar e qual é o impacto no usuário?
- **Visão de esforço:** o time tem capacidade técnica e tempo para executar com segurança?
- **Visão de valor:** o que melhora concretamente após a migração?
- **Visão de reversibilidade:** se der errado, conseguimos voltar rápido?
- **Visão incremental:** conseguimos migrar em partes menores e independentes?

## Regras

- Nenhuma migração estrutural sem justificativa de valor documentada.
- Nenhuma migração sem testes cobrindo as áreas afetadas antes de começar.
- Nenhuma migração big bang em módulo crítico sem aprovação explícita.
- Migrar em etapas pequenas sempre que possível — reduz risco, facilita debugging.
- Deixar estratégia de rollback documentada antes de iniciar.
