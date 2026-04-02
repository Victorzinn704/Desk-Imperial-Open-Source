# Documentacao do Projeto

Este arquivo organiza a documentacao do Desk Imperial por prioridade de leitura e confiabilidade.

## 1. Ordem Recomendada de Leitura

1. `../README.md`
2. `../DOCS_DESK_IMPERIAL.md`
3. `release/` (diagnosticos e plano de release)
4. demais trilhas de `architecture/`, `operations/`, `security/`, `testing/`

## 2. Fontes Canonicas

As fontes canonicas para entendimento tecnico atual sao:

- `../README.md`
- `../DOCS_DESK_IMPERIAL.md`
- `release/`

## 3. Status da Documentacao

### 3.1 Atual e confiavel

- `../README.md`
- `../DOCS_DESK_IMPERIAL.md`
- `release/` (especialmente mapa real, diagnostico e parecer)
- `architecture/overview.md`
- `architecture/authentication-flow.md`
- `testing/testing-guide.md`
- `troubleshooting.md`

### 3.2 Parcialmente atual

- `security/security-baseline.md`
- `operations/kpi-realtime-mapping.md`

## 4. Estrutura Recomendada de Longo Prazo

```text
docs/
├── README.md
├── architecture/
│   ├── system-overview.md
│   ├── api-boundaries.md
│   ├── frontend-dataflow.md
│   └── realtime-model.md
├── operations/
│   ├── salon-flow.md
│   ├── cash-session-flow.md
│   ├── comanda-kitchen-flow.md
│   └── kpi-realtime-mapping.md
├── security/
│   ├── security-baseline.md
│   ├── auth-and-session.md
│   ├── csrf-cors-model.md
│   └── hardening-backlog.md
├── testing/
│   ├── testing-strategy.md
│   ├── backend-test-matrix.md
│   ├── frontend-test-matrix.md
│   └── e2e-critical-paths.md
├── integrations/
│   ├── email-brevo.md
│   ├── gemini-insights.md
│   ├── geocoding.md
│   └── currency-rates.md
└── release/
    ├── mapa-real-sistema.md
    ├── diagnostico-release-readiness.md
    ├── plano-lapidacao-release.md
    └── parecer-final-release-v3.md
```

## 5. Regras de Manutencao

- Toda mudanca de comportamento de API ou fluxo critico deve atualizar documento canonico no mesmo PR.
- Documento parcialmente atual deve explicitar limites de cobertura.
- Evitar textos de marketing tecnico; documentar comportamento observavel e riscos residuais.
- Para claims de seguranca, sempre ligar com implementacao real e limitacao conhecida.

## 6. Definicao de Pronto para Docs

Uma entrega de documentacao e considerada pronta quando:

1. esta alinhada ao comportamento atual do codigo
2. declara explicitamente lacunas e riscos
3. nao contradiz as fontes canonicas
4. permite onboarding tecnico sem dependencia de contexto oral
