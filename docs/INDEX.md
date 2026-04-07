# Índice de Documentação — Desk Imperial

Navegação central de toda a documentação do projeto.

---

## Para quem é esta documentação

| Perfil                            | Por onde começar                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Comerciante / usuário final**   | [O produto e para quem é](./product/overview.md) → [Como usar](../README.md#quick-start)                                         |
| **Desenvolvedor novo no projeto** | [README](../README.md) → [Setup local](./architecture/local-development.md) → [Módulos](./architecture/modules.md)               |
| **Contribuidor**                  | [CONTRIBUTING.md](../CONTRIBUTING.md) → [Módulos](./architecture/modules.md) → [Banco de dados](./architecture/database.md)      |
| **Recrutador / tech lead**        | [README](../README.md) → [Requisitos](./product/requirements.md) → [Módulos](./architecture/modules.md)                          |
| **Segurança**                     | [SECURITY.md](../SECURITY.md) → [Baseline](./security/security-baseline.md) → [Deploy checklist](./security/deploy-checklist.md) |

---

## Produto

| Documento                                                              | O que cobre                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| [product/overview.md](./product/overview.md)                           | O que é o Desk Imperial, para quem é, por que existe, missão |
| [product/requirements.md](./product/requirements.md)                   | Requisitos funcionais (RF) e não-funcionais (RNF)            |
| [product/user-flows.md](./product/user-flows.md)                       | Fluxos principais do dono e do funcionário                   |
| [product/risks-and-limitations.md](./product/risks-and-limitations.md) | Riscos conhecidos, limitações atuais, débito técnico         |

---

## Arquitetura

| Documento                                                                    | O que cobre                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| [architecture/overview.md](./architecture/overview.md)                       | Visão geral da arquitetura e decisões técnicas            |
| [architecture/modules.md](./architecture/modules.md)                         | Responsabilidade de cada um dos 16 módulos de domínio     |
| [architecture/database.md](./architecture/database.md)                       | Schema do banco documentado por entidade e relacionamento |
| [architecture/realtime.md](./architecture/realtime.md)                       | Fluxo Socket.IO — namespace, eventos, ciclo de vida       |
| [architecture/authentication-flow.md](./architecture/authentication-flow.md) | Fluxo completo de autenticação, sessão e CSRF             |
| [architecture/local-development.md](./architecture/local-development.md)     | Guia de setup do ambiente de desenvolvimento local        |
| [architecture/coding-standards.md](./architecture/coding-standards.md)       | Padrões de código do projeto                              |

---

## Agentes de IA

| Documento                                                                              | O que cobre                                                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [agents/README.md](./agents/README.md)                                                 | Sistema de agentes, fronteiras, papéis e fluxo de uso                       |
| [agents/32-frontend-product-lead-agent.md](./agents/32-frontend-product-lead-agent.md) | Padrão sênior para frontend, UX/UI, SaaS dashboards e maturidade de produto |

---

## Frontend e UI

| Documento                                                                                  | O que cobre                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [frontend/ui-guidelines.md](./frontend/ui-guidelines.md)                                   | Diretrizes atuais de UI, componentes e padrões de interação                     |
| [frontend/visual-reform-audit-2026-04-06.md](./frontend/visual-reform-audit-2026-04-06.md) | Auditoria comparativa e plano de reforma visual inspirado nos repositórios-base |

---

## Segurança

| Documento                                                                                                | O que cobre                                                      |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [SECURITY.md](../SECURITY.md)                                                                            | Política de segurança e como reportar vulnerabilidades           |
| [security/security-baseline.md](./security/security-baseline.md)                                         | Baseline de segurança do projeto                                 |
| [security/admin-pin-hardening.md](./security/admin-pin-hardening.md)                                     | Hardening do Admin PIN                                           |
| [security/deploy-checklist.md](./security/deploy-checklist.md)                                           | Checklist de deploy seguro                                       |
| [security/observability-and-logs.md](./security/observability-and-logs.md)                               | Observabilidade, logs e rastreamento                             |
| [security/dependency-risk-acceptance-2026-04-01.md](./security/dependency-risk-acceptance-2026-04-01.md) | Aceite temporário de risco de dependências e plano de remediação |

---

## Operações

| Documento                                                                          | O que cobre                          |
| ---------------------------------------------------------------------------------- | ------------------------------------ |
| [operations/flows.md](./operations/flows.md)                                       | Fluxos operacionais do sistema       |
| [operations/kpi-realtime-mapping.md](./operations/kpi-realtime-mapping.md)         | Mapeamento de KPIs em tempo real     |
| [operations/observability-oss-phase1.md](./operations/observability-oss-phase1.md) | Rollout inicial de OpenTelemetry OSS |
| [../infra/oracle/ops/README.md](../infra/oracle/ops/README.md)                     | Runbook da stack Oracle Ops          |
| [../infra/oracle/THREE_VM_STRATEGY.md](../infra/oracle/THREE_VM_STRATEGY.md)       | Estratégia operacional das 3 VMs     |

---

## Testes

| Documento                                                                                                    | O que cobre                                               |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [testing/testing-guide.md](./testing/testing-guide.md)                                                       | Guia completo de testes do projeto                        |
| [testing/coverage-snapshot-2026-04-03.md](./testing/coverage-snapshot-2026-04-03.md)                         | Snapshot de cobertura atual por area e global             |
| [testing/coverage-upgrade-session-2026-04-03.md](./testing/coverage-upgrade-session-2026-04-03.md)           | Relatorio detalhado da sessao de upgrade para metas 90/85 |
| [testing/load-testing.md](./testing/load-testing.md)                                                         | Estratégia e comandos de testes de carga                  |
| [testing/AUDITORIA_TESTES_COMPLETA.md](./testing/AUDITORIA_TESTES_COMPLETA.md)                               | Auditoria completa da cobertura de testes                 |
| [release/sonarqube-auditoria-e-sprints-2026-04-03.md](./release/sonarqube-auditoria-e-sprints-2026-04-03.md) | Plano de adoção do SonarQube e backlog por sprint         |
| [release/oracle-cloud-runtime-plan-2026-04-04.md](./release/oracle-cloud-runtime-plan-2026-04-04.md)         | Plano de runtime alvo em Oracle Cloud mantendo Neon       |

---

## Release e diagnóstico

| Documento                                                                                                    | O que cobre                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [release/gaps-and-risks-2026-03-28.md](./release/gaps-and-risks-2026-03-28.md)                               | Gaps e riscos identificados pré-release                     |
| [release/release-criteria-2026-03-28.md](./release/release-criteria-2026-03-28.md)                           | Critérios de release                                        |
| [release/parecer-tecnico-final-2026-04-01.md](./release/parecer-tecnico-final-2026-04-01.md)                 | Parecer técnico final                                       |
| [release/plano-lapidacao-release-2026-04-01.md](./release/plano-lapidacao-release-2026-04-01.md)             | Plano de lapidação para release                             |
| [release/sonarqube-auditoria-e-sprints-2026-04-03.md](./release/sonarqube-auditoria-e-sprints-2026-04-03.md) | Backlog do SonarQube com sprints                            |
| [../README_PROFILE.md](../README_PROFILE.md)                                                                 | Template de perfil técnico com cards de stack e ferramentas |
| [release/sonarqube-local-scan-2026-04-03.json](./release/sonarqube-local-scan-2026-04-03.json)               | Resumo bruto do primeiro scan local                         |
| [release/sonarqube-local-issues-2026-04-03.json](./release/sonarqube-local-issues-2026-04-03.json)           | Export completo das issues do scan                          |
| [release/sonarqube-local-hotspots-2026-04-03.json](./release/sonarqube-local-hotspots-2026-04-03.json)       | Export completo dos security hotspots                       |

---

## Comunidade e criador

| Documento                                  | O que cobre                                |
| ------------------------------------------ | ------------------------------------------ |
| [CREATOR.md](./CREATOR.md)                 | História e motivação do criador do projeto |
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Dicas práticas para novos desenvolvedores  |
| [DOC-PLAN.md](./DOC-PLAN.md)               | Plano mestre desta documentação            |
| [ROADMAP.md](../ROADMAP.md)                | O que está feito, em andamento e planejado |
| [CONTRIBUTING.md](../CONTRIBUTING.md)      | Como contribuir com o projeto              |

---

## Estrutura de pastas da documentação

```
docs/
├── INDEX.md                  # Este arquivo
├── DOC-PLAN.md               # Plano mestre de documentação
├── CREATOR.md                # Relato pessoal do criador
├── GETTING-STARTED.md        # Dicas para novos devs
├── product/
│   ├── overview.md           # O produto, para quem, por que
│   ├── requirements.md       # RF e RNF
│   ├── user-flows.md         # Fluxos do usuário
│   └── risks-and-limitations.md
├── architecture/
│   ├── overview.md
│   ├── modules.md            # 16 módulos de domínio
│   ├── database.md           # Schema documentado
│   ├── realtime.md           # Socket.IO
│   ├── authentication-flow.md
│   ├── local-development.md
│   └── coding-standards.md
├── security/
│   ├── security-baseline.md
│   ├── admin-pin-hardening.md
│   ├── deploy-checklist.md
│   ├── observability-and-logs.md
│   └── dependency-risk-acceptance-2026-04-01.md
├── operations/
│   ├── flows.md
│   ├── kpi-realtime-mapping.md
│   └── observability-oss-phase1.md
├── testing/
│   ├── testing-guide.md
│   └── AUDITORIA_TESTES_COMPLETA.md
└── release/
    └── (arquivos de diagnóstico e release)
```
