# Matriz de Riscos — Desk Imperial

**Data:** 2026-04-09
**Eixos:** Impacto (1-5) x Probabilidade (1-5) x Esforco (Baixo/Medio/Alto)

---

| ID  | Risco                                                                                             | Impacto | Prob. | Esforco | Score | Prioridade |
| --- | ------------------------------------------------------------------------------------------------- | ------- | ----- | ------- | ----- | ---------- |
| R01 | `auth.service.ts` (2433 linhas) — bug em auth = breach total                                      | 5       | 3     | Alto    | 15    | P1         |
| R02 | `operations-helpers.service.ts` (1451 linhas) — logica de caixa/comanda errada = perda financeira | 5       | 3     | Alto    | 15    | P1         |
| R03 | `comanda.service.ts` (1607 linhas) — race condition em comanda = dados corrompidos                | 5       | 2     | Medio   | 10    | P1         |
| R04 | Deploy manual (railway up antes de git push) — deploy sem rastreabilidade                         | 4       | 3     | Medio   | 12    | P1         |
| R05 | `api.ts` (1315 linhas) — erro em chamada de API = UX quebrada                                     | 4       | 3     | Baixo   | 12    | P1         |
| R06 | Senha default fraca no docker-compose — exposicao local                                           | 3       | 2     | Baixo   | 6     | P2         |
| R07 | `NPM_CONFIG_AUDIT: false` no CI — vulnerabilidade de dependencia nao detectada                    | 4       | 2     | Baixo   | 8     | P2         |
| R08 | `use-operations-realtime.ts` (1258 linhas) — bug em realtime = operacao parada                    | 4       | 3     | Medio   | 12    | P1         |
| R09 | Sem migrations no repo — perda de versionamento de schema                                         | 5       | 1     | Baixo   | 5     | P2         |
| R10 | `commercial-calendar.tsx` (833 linhas) — bug em calendario = perda de funcionalidade              | 3       | 2     | Medio   | 6     | P3         |
| R11 | SonarQube local no repo — dificuldade de atualizacao                                              | 2       | 2     | Baixo   | 4     | P3         |
| R12 | `desk-command-center-prototype.tsx` — codigo experimental em producao                             | 3       | 2     | Baixo   | 6     | P2         |
| R13 | Workspace isolation falho — vazamento de dados entre tenants                                      | 5       | 1     | Alto    | 5     | P1         |
| R14 | Admin PIN rate limit bypass — operacoes nao autorizadas                                           | 4       | 1     | Medio   | 4     | P2         |

---

## Top 5 Riscos por Score

| Rank | Risco                            | Score | Acao Imediata                   |
| ---- | -------------------------------- | ----- | ------------------------------- |
| 1    | Auth service god file (R01)      | 15    | Decompor em 5+ servicos menores |
| 2    | Operations helper god file (R02) | 15    | Decompor em domain services     |
| 3    | Deploy manual (R04)              | 12    | Automatizar via CI/CD           |
| 4    | api.ts god file (R05)            | 12    | Separar por dominio             |
| 5    | Realtime hook god file (R08)     | 12    | Decompor em hooks menores       |

---

## Mapa de Calor

```
Probabilidade
  5 |         |         |         |         | R01, R02
  4 |         |         |         |         |
  3 |         |         |         | R04, R05| R08
  2 |         |         | R06, R10| R07, R12|
  1 |         |         | R09, R13| R14     |
    +---------+---------+---------+---------+
      1         2         3         4         5  Impacto
```
