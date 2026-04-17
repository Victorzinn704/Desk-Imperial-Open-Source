# Refatoracao Cirurgica - Progresso Consolidado

**Atualizado em:** 2026-04-13
**Modo:** consolidacao por clusters com guardrails ativos

---

## 1. Estado Atual de Qualidade

| Indicador | Valor |
| --- | ---: |
| `quality:scope:strict` | PASS |
| `quality:contracts` | PASS |
| `quality:preflight` | FAIL (`diff whitespace`) |
| ESLint errors | 0 |
| ESLint warnings | 463 |
| Sonar hotspots | 0 |
| Sonar gate | ERROR |

---

## 2. O que ja foi estabilizado

1. baseline funcional de build e testes criticos sem quebra nesta rodada;
2. mapeamento de warning/cobertura automatizado em `quality:warnings`;
3. protecao de contratos publicos contra snapshot Oracle;
4. consolidacao dos artefatos de auditoria em `review_audit`.

---

## 3. Frentes de Refatoracao Ativa

### Frente 1 - Smells mecanicos de alto volume

- alvo: `max-lines-per-function`, `no-non-null-assertion`, `no-nested-ternary`, `complexity`
- estrategia: extracoes pequenas + teste de caracterizacao

### Frente 2 - Cobertura de superficie operacional

- alvo: `dashboard`, `owner-mobile`, `staff-mobile`, `operations`
- estrategia: testes por jornada critica e reducao de uncovered lines

### Frente 3 - Reducao de acoplamento

- alvo: ciclos de modulo no backend e corredores de invaldacao cruzada
- estrategia: manter facade, extrair orquestracao e reduzir dependencia direta

---

## 4. Backlog Curto (ordem sugerida)

1. limpar whitespace residual para restaurar `quality:preflight`;
2. ajustar cobertura web para incluir owner mobile em trilha oficial;
3. reduzir warnings nos top 10 arquivos do warning map;
4. invalidar caches monetarios derivados ao trocar moeda de perfil;
5. fechar runbooks de staging e incidente.

---

## 5. Definicao de Pronto para Fechar a Fase

A fase de refatoracao estabilizada termina quando:

1. Sonar `new_coverage >= 90` e `new_violations = 0`;
2. warnings <= 300 sem erro novo;
3. runbooks operacionais principais estiverem publicados;
4. CI tiver cobertura minima estavel para o fluxo web critico.
