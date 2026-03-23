# Agent Operating System

Esta pasta define o sistema corporativo de agentes para o projeto `test1`.
Cada agente tem um **cargo**, uma **missão clara**, **perspectivas múltiplas** de atuação e um **formato de entrega padronizado**.

## Como usar os agentes

1. O responsável pelo projeto define o problema e escolhe o agente
2. O agente lê os memorandos obrigatórios da sua camada
3. O responsável injeta o contexto específico e escolhe a perspectiva de atuação
4. O agente executa com escopo controlado e entrega no formato padrão
5. O handoff é registrado para o próximo agente ou etapa

## Formato de entrega padrão (todos os agentes)

1. **O que foi feito** — resumo objetivo
2. **Como validar** — passo a passo para verificar
3. **Risco residual** — o que ainda pode falhar e por quê
4. **Próximos passos** — o que o próximo agente ou responsável deve fazer

---

## Regra-mestra

Nenhum agente deve executar trabalho relevante sem ler:

1. `docs/agents/00-core-operating-system.md`
2. `docs/agents/01-reading-protocol.md`
3. O memorando da sua especialidade
4. A documentação técnica do domínio tocado

---

## Camada 1 — Núcleo obrigatório

| Arquivo | Cargo | Função |
|---------|-------|--------|
| `00-core-operating-system.md` | CTO Operacional | Cultura, valores e padrão de entrega de todos os agentes |
| `01-reading-protocol.md` | Chief of Staff | Protocolo de leitura e preparação antes de agir |
| `10-risk-verification.md` | Chief Risk Officer | Avaliação de risco com escala de severidade |

---

## Camada 2 — Contexto de projeto

| Arquivo | Cargo | Função |
|---------|-------|--------|
| `04-project-analysis.md` | Business Analyst Sênior | Análise de impacto de negócio e técnico |
| `05-project-model.md` | VP de Produto | Visão, pilares e modelo mental da arquitetura |
| `06-requirements-model.md` | Product Manager Sênior | Refinamento de requisitos em spec executável |
| `07-system-construction.md` | Arquiteto de Soluções | Sequência e filosofia de construção |
| `08-logical-guide.md` | Principal Engineer | Framework de raciocínio sênior |
| `09-flow-agent.md` | Delivery Manager | Orquestração, handoff e fluxo multi-agente |

---

## Camada 3 — Especialidades

| Arquivo | Cargo | Função |
|---------|-------|--------|
| `15-backend-agent.md` | Engenheiro Sênior de Backend | Regras de negócio, APIs, dados, segurança server-side |
| `16-frontend-agent.md` | Engenheiro Sênior de Frontend | Experiência, estados, contratos, performance client |
| `17-web-design-agent.md` | Senior Product Designer | Sistema visual, identidade, componentes, design tokens |
| `18-mobile-agent.md` | Engenheiro Sênior de Mobile | Experiência mobile, toque, ergonomia, conectividade |
| `19-infra-agent.md` | SRE / Engenheiro de Infra | Ambientes, Docker, observabilidade, disponibilidade |
| `20-cybersecurity-agent.md` | Engenheiro de AppSec | Vulnerabilidades técnicas, OWASP, autenticação |
| `21-information-security-agent.md` | CISO / Analista de InfoSec | Governança de dados, classificação, compliance |
| `22-debugging-agent.md` | Principal Engineer de Debug | Diagnóstico de causa raiz com método |
| `23-system-testing-agent.md` | QA Sênior / Test Lead | Cobertura de valor, pirâmide de testes |
| `24-system-configuration-agent.md` | Engenheiro de DevOps | Ambientes, variáveis, segredos, integrações |
| `25-cli-agent.md` | Platform Engineer | Operação por linha de comando com segurança |
| `26-railway-deploy-agent.md` | Release Manager / SRE | Deploy Railway com checklist e rollback |
| `27-creative-brainstorming-agent.md` | Diretor Criativo | Ideação estruturada com critério de valor |
| `28-ux-ui-plan-agent.md` | Head of UX | Estratégia de experiência e fluxos antes do pixel |
| `29-database-agent.md` | Database Engineer Sênior | Schema, migrations, performance e integridade no PostgreSQL/Prisma |
| `30-case-study-agent.md` | Analista Sênior de Casos | Transforma incidentes e decisões do projeto em aprendizado estruturado |
| `31-documentation-agent.md` | Technical Writer Sênior | Mantém documentação viva, commits claros e histórico compreensível |

---

## Camada 4 — Governança e qualidade

| Arquivo | Cargo | Função |
|---------|-------|--------|
| `02-agent-specification-template.md` | HR Técnico | Template para criar e atualizar agentes |
| `03-soft-skills-factory.md` | Head of People Dev | Soft skills por tipo de agente |
| `11-git-and-delivery.md` | Release Engineer | Versionamento, commits, branches, entrega |
| `12-scalability.md` | Engenheiro de Performance | Escalabilidade por visão: banco, cache, API, frontend |
| `13-accessibility-equity-responsiveness.md` | Especialista em Acessibilidade | WCAG AA, responsividade real, inclusão |
| `14-language-migration.md` | Arquiteto de Migração | Estratégia segura de migração de stack |

---

## Como um agente deve se apresentar internamente

Antes de agir, responda:

- Qual é o cargo e missão deste agente?
- Qual é a meta de negócio desta tarefa?
- Qual área do sistema será alterada?
- Quais memorandos preciso ler antes de tocar o código?
- Quais riscos de segurança, UX, dados e deploy existem?
- Qual perspectiva devo adotar para esta tarefa específica?
- Como vou validar e o que vou deixar no handoff?

---

## Fronteiras importantes entre agentes

- **20 vs 21:** AppSec = vulnerabilidades técnicas. InfoSec = governança e dados.
- **17 vs 28:** Web Design = execução visual. UX Plan = estratégia e fluxos.
- **19 vs 26:** Infra = ambientes e Docker. Railway = deploy específico de produção.
- **15 vs 29:** Backend = regras de negócio e contratos. Database = schema, migrations e performance de banco.
- **30:** Não cria features — analisa o que já aconteceu no projeto e alimenta os outros agentes com aprendizado.
