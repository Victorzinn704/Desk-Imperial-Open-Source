# Indice de Documentacao - Desk Imperial

Navegacao central de toda a documentacao publica do projeto.

---

## Para quem e esta documentacao

| Perfil                            | Por onde comecar                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comerciante / usuario final**   | [O produto e para quem e](./product/overview.md) -> [Como usar](../README.md#quick-start)                                                                |
| **Desenvolvedor novo no projeto** | [README](../README.md) -> [Setup local](./architecture/local-development.md) -> [Modulos](./architecture/modules.md)                                     |
| **Contribuidor**                  | [CONTRIBUTING.md](../CONTRIBUTING.md) -> [Modulos](./architecture/modules.md) -> [Banco de dados](./architecture/database.md)                            |
| **Tech lead / auditor**           | [README](../README.md) -> [Architecture overview](./architecture/overview.md) -> [Realtime recovery](./waves/realtime-recovery-plan-2026-05-01.md)       |
| **Seguranca**                     | [SECURITY.md](../SECURITY.md) -> [Baseline](./security/security-baseline.md) -> [Workflow de testes](./security/security-testing-workflow-2026-04-30.md) |

---

## Regra do repositorio aberto

Este mirror e atualizado por waves.

Na pratica:

- documentos de rollout, recovery e estado operacional podem ser atualizados antes do sync completo de todas as trilhas de codigo
- artefatos sensiveis de host, segredo ou topologia interna ficam fora do mirror publico ou entram apenas em versao sanitizada

---

## Produto

| Documento                                                              | O que cobre                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [product/overview.md](./product/overview.md)                           | O que e o Desk Imperial, para quem e, por que existe  |
| [product/requirements.md](./product/requirements.md)                   | Requisitos funcionais e nao-funcionais                |
| [product/user-flows.md](./product/user-flows.md)                       | Fluxos principais do dono e do funcionario            |
| [product/risks-and-limitations.md](./product/risks-and-limitations.md) | Riscos conhecidos, limitacoes atuais e debito tecnico |

---

## Arquitetura

| Documento                                                                    | O que cobre                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [architecture/overview.md](./architecture/overview.md)                       | Visao geral da arquitetura e decisoes tecnicas                     |
| [architecture/modules.md](./architecture/modules.md)                         | Responsabilidade dos modulos de dominio presentes no mirror aberto |
| [architecture/database.md](./architecture/database.md)                       | Schema do banco documentado por entidade e relacionamento          |
| [architecture/realtime.md](./architecture/realtime.md)                       | Fluxo Socket.IO, eventos e ciclo de vida                           |
| [architecture/authentication-flow.md](./architecture/authentication-flow.md) | Fluxo completo de autenticacao, sessao e CSRF                      |
| [architecture/local-development.md](./architecture/local-development.md)     | Guia de setup do ambiente de desenvolvimento local                 |
| [architecture/coding-standards.md](./architecture/coding-standards.md)       | Padroes de codigo do projeto                                       |

---

## Seguranca

| Documento                                                                                                | O que cobre                                                      |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [SECURITY.md](../SECURITY.md)                                                                            | Politica de seguranca e como reportar vulnerabilidades           |
| [security/security-baseline.md](./security/security-baseline.md)                                         | Baseline publica de seguranca do projeto                         |
| [security/security-testing-workflow-2026-04-30.md](./security/security-testing-workflow-2026-04-30.md)   | Ordem correta entre SAST, Nmap, observabilidade de host e IDS    |
| [security/admin-pin-hardening.md](./security/admin-pin-hardening.md)                                     | Hardening do Admin PIN                                           |
| [security/deploy-checklist.md](./security/deploy-checklist.md)                                           | Checklist de deploy seguro                                       |
| [security/observability-and-logs.md](./security/observability-and-logs.md)                               | Observabilidade, logs e rastreamento                             |
| [security/dependency-risk-acceptance-2026-04-01.md](./security/dependency-risk-acceptance-2026-04-01.md) | Aceite temporario de risco de dependencias e plano de remediacao |

---

## Operacoes

| Documento                                                                            | O que cobre                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [operations/flows.md](./operations/flows.md)                                         | Fluxos operacionais do sistema                         |
| [operations/kpi-realtime-mapping.md](./operations/kpi-realtime-mapping.md)           | Mapeamento de KPIs em tempo real                       |
| [operations/observability-oss-phase1.md](./operations/observability-oss-phase1.md)   | Rollout inicial de OpenTelemetry OSS                   |
| [operations/telegram-bot-rollout.md](./operations/telegram-bot-rollout.md)           | Bootstrap e rollout operacional do bot Telegram        |
| [operations/sentry-rollout-2026-05-01.md](./operations/sentry-rollout-2026-05-01.md) | Integracao de Sentry em web, API, release e sourcemaps |

---

## Testes

| Documento                                                                      | O que cobre                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| [testing/testing-guide.md](./testing/testing-guide.md)                         | Guia completo de testes do projeto        |
| [testing/load-testing.md](./testing/load-testing.md)                           | Estrategia e comandos de testes de carga  |
| [testing/AUDITORIA_TESTES_COMPLETA.md](./testing/AUDITORIA_TESTES_COMPLETA.md) | Auditoria completa da cobertura de testes |

---

## Waves e recuperacao

| Documento                                                                                                | O que cobre                                                     |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [waves/realtime-wave-0-inventory-2026-05-01.md](./waves/realtime-wave-0-inventory-2026-05-01.md)         | Inventario da malha realtime antes de mexer                     |
| [waves/realtime-recovery-plan-2026-05-01.md](./waves/realtime-recovery-plan-2026-05-01.md)               | Plano executavel por waves para recovery do realtime            |
| [waves/realtime-validation-checklist-2026-05-01.md](./waves/realtime-validation-checklist-2026-05-01.md) | Checklist minimo de validacao funcional, sessao, mobile e ruido |

---

## Release e diagnostico

| Documento                                                                                        | O que cobre                             |
| ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| [release/gaps-and-risks-2026-03-28.md](./release/gaps-and-risks-2026-03-28.md)                   | Gaps e riscos identificados pre-release |
| [release/release-criteria-2026-03-28.md](./release/release-criteria-2026-03-28.md)               | Criterios de release                    |
| [release/parecer-tecnico-final-2026-04-01.md](./release/parecer-tecnico-final-2026-04-01.md)     | Parecer tecnico final                   |
| [release/plano-lapidacao-release-2026-04-01.md](./release/plano-lapidacao-release-2026-04-01.md) | Plano de lapidacao para release         |

---

## Comunidade e criador

| Documento                                  | O que cobre                                |
| ------------------------------------------ | ------------------------------------------ |
| [CREATOR.md](./CREATOR.md)                 | Historia e motivacao do criador do projeto |
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Dicas praticas para novos desenvolvedores  |
| [DOC-PLAN.md](./DOC-PLAN.md)               | Plano mestre desta documentacao            |
| [ROADMAP.md](../ROADMAP.md)                | O que esta feito, em andamento e planejado |
| [CONTRIBUTING.md](../CONTRIBUTING.md)      | Como contribuir com o projeto              |
