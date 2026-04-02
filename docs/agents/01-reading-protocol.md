# Reading Protocol for Every Agent

## Cargo

**Chief of Staff / Gerente de Operações**
Garante que nenhum agente inicie trabalho sem o contexto correto. É o guardião do processo antes da execução.

## Objetivo

Garantir que cada agente leia o contexto certo antes de agir, como um briefing operacional obrigatório.

## Protocolo

### Etapa 1. Classificar a natureza da tarefa

Identifique a categoria principal:

- backend
- frontend
- design web
- mobile
- infra
- cibersegurança
- segurança da informação
- debugging
- teste
- configuração
- CLI
- deploy
- brainstorming criativo
- planejamento de UX e UI
- migração técnica
- escalabilidade
- banco de dados e migrations
- análise de casos e padrões do projeto

Se a tarefa cruzar mais de uma categoria, leia os memorandos de todas as áreas afetadas.

### Etapa 2. Ler o núcleo obrigatório

Leitura mínima antes de qualquer ação:

1. `docs/agents/00-core-operating-system.md`
2. `docs/agents/04-project-analysis.md`
3. `docs/agents/10-risk-verification.md`

### Etapa 3. Ler o memorando de especialidade

Exemplos:

- backend: `docs/agents/15-backend-agent.md`
- frontend: `docs/agents/16-frontend-agent.md`
- design web: `docs/agents/17-web-design-agent.md`
- mobile: `docs/agents/18-mobile-agent.md`
- infra: `docs/agents/19-infra-agent.md`
- cibersegurança: `docs/agents/20-cybersecurity-agent.md`
- segurança da informação: `docs/agents/21-information-security-agent.md`
- debugging: `docs/agents/22-debugging-agent.md`
- testes: `docs/agents/23-system-testing-agent.md`
- configuração: `docs/agents/24-system-configuration-agent.md`
- CLI: `docs/agents/25-cli-agent.md`
- deploy Railway: `docs/agents/26-railway-deploy-agent.md`
- banco de dados: `docs/agents/29-database-agent.md`
- análise de casos: `docs/agents/30-case-study-agent.md`
- brainstorming: `docs/agents/27-creative-brainstorming-agent.md`
- UX e UI: `docs/agents/28-ux-ui-plan-agent.md`

Para tarefas multi-agente ou fluxos encadeados, leia também: `docs/agents/09-flow-agent.md`

### Etapa 4. Ler a documentação técnica viva

Localize e leia a documentação do domínio afetado:

- arquitetura geral: `docs/architecture/overview.md`
- padrões de código: `docs/architecture/coding-standards.md`
- desenvolvimento local: `docs/architecture/local-development.md`
- autenticação: `docs/architecture/authentication-flow.md`
- frontend e UI: `docs/frontend/ui-guidelines.md`
- segurança: `docs/security/security-baseline.md`
- observabilidade: `docs/security/observability-and-logs.md`
- testes: `docs/testing/testing-guide.md`
- troubleshooting: `docs/troubleshooting.md`

### Etapa 5. Montar o mapa de execução

Antes de editar qualquer arquivo, o agente deve responder:

- O que vou mudar e por que isso importa?
- Quais arquivos ou módulos têm maior risco?
- Como vou validar?
- Que documentação precisa ser atualizada?
- Que contexto devo deixar para o próximo agente?

## Regra de mudança de escopo

Se a tarefa mudar de natureza durante a execução, o agente deve pausar, ler o memorando da nova área e só então continuar.

## Regra de entrega

Ao final de toda tarefa, siga o formato de entrega definido em `docs/agents/00-core-operating-system.md`.
