# Documentacao do Projeto

Este arquivo organiza a documentacao publica do Desk Imperial por prioridade de leitura, confiabilidade e nivel de exposicao seguro para um repositorio aberto.

## 1. Ordem recomendada de leitura

1. `../README.md`
2. `../DOCS_DESK_IMPERIAL.md`
3. `INDEX.md`
4. `product/`
5. `architecture/`
6. `operations/`
7. `security/`
8. `waves/`

## 2. Regra do mirror aberto

O Desk Imperial hoje e atualizado por waves.

Na pratica:

- a documentacao publica pode ser atualizada antes do sync completo de toda a arvore de codigo
- material operacional sensivel nao entra aqui sem sanitizacao
- claims tecnicas precisam deixar claro se descrevem o mirror aberto ou o estado mais novo do projeto principal

## 3. Fontes canonicas

As fontes canonicas para entendimento tecnico publico atual sao:

- `../README.md`
- `../DOCS_DESK_IMPERIAL.md`
- `INDEX.md`
- `product/overview.md`
- `architecture/overview.md`
- `architecture/authentication-flow.md`
- `architecture/realtime.md`
- `operations/telegram-bot-rollout.md`
- `operations/sentry-rollout-2026-05-01.md`
- `security/security-testing-workflow-2026-04-30.md`
- `waves/realtime-recovery-plan-2026-05-01.md`

## 4. Status da documentacao

### 4.1 Atual e confiavel

- `../README.md`
- `../DOCS_DESK_IMPERIAL.md`
- `INDEX.md`
- `product/overview.md`
- `architecture/overview.md`
- `architecture/authentication-flow.md`
- `architecture/realtime.md`
- `operations/telegram-bot-rollout.md`
- `operations/sentry-rollout-2026-05-01.md`
- `security/security-testing-workflow-2026-04-30.md`
- `waves/realtime-*.md`

### 4.2 Parcialmente atual

- `security/security-baseline.md`
- `operations/kpi-realtime-mapping.md`
- parte da trilha `release/`, que continua historica em varios pontos

## 5. Regras de manutencao

- Toda mudanca de comportamento de API, autenticacao, realtime, operacao mobile ou rollout de infraestrutura deve atualizar ao menos um documento canonico no mesmo PR.
- Documento parcial deve declarar o proprio limite.
- Documento publico nao deve carregar segredo, host interno, token, IP privado ou caminho absoluto local.
- Claims de seguranca precisam distinguir claramente:
  - protecao de codigo
  - seguranca de exposicao
  - monitoramento continuo

## 6. Definicao de pronto

Uma entrega de documentacao publica so esta pronta quando:

1. esta alinhada ao estado atual conhecido do projeto
2. explicita lacunas, riscos e diferenca entre mirror aberto e mainline
3. nao contradiz `README.md` nem `INDEX.md`
4. permite onboarding tecnico sem dependencia de contexto oral
