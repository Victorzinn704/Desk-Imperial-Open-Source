# Workflow de Evidencia de Colaboracao

**Data:** 2026-05-19
**Estado:** canonico
**Objetivo:** transformar trabalho solo em evidencia revisavel de engenharia profissional.

## Por que isso existe

Um projeto solo pode ter codigo forte e ainda assim nao provar senioridade coletiva. A partir deste workflow, mudancas relevantes devem deixar rastros que um revisor externo consiga entender: problema, decisao, risco, validacao e criterio de aceite.

## Regra principal

Toda mudanca deve responder quatro perguntas antes do merge:

1. qual problema de produto ou operacao foi resolvido;
2. quais superficies foram tocadas;
3. qual risco foi introduzido ou reduzido;
4. como alguem independente validaria o resultado.

## Tamanhos de mudanca

| Tipo           | Quando usar                                                | Evidencia minima                                          |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Patch pequeno  | bug claro, doc, teste, ajuste isolado                      | PR template preenchido e teste/gate focado                |
| Tarefa tecnica | performance, refatoracao, code health, infra               | issue tecnica com criterio de aceite e plano de validacao |
| RFC curta      | auth, pagamento, realtime, dados, deploy, contrato publico | documento usando `docs/architecture/rfc-template.md`      |
| Incidente      | producao, CI, deploy, seguranca ou perda de dados          | resumo de causa, mitigacao, rollback e follow-up          |

## Issue com criterio de aceite

Uma issue pronta para trabalho precisa conter:

- usuario ou sistema afetado;
- sintoma ou oportunidade;
- escopo fora e dentro;
- criterio de aceite verificavel;
- comandos de validacao esperados;
- risco e rollback quando houver runtime.

## PR pequeno e revisavel

PR bom deve ser lido em blocos:

1. contrato ou tipo;
2. regra pura/helper;
3. service/hook/controller;
4. view/UI quando houver;
5. teste;
6. doc/runbook;
7. evidencia de validacao.

Se o diff misturar feature, refatoracao grande e ajuste visual sem relacao direta, divida.

## Quando abrir RFC

Use RFC antes de implementar quando a mudanca tocar:

- auth, sessao, Admin PIN ou CSRF;
- pagamento, caixa, fechamento ou reconciliacao financeira;
- realtime, Redis, cache ou PWA offline;
- schema Prisma, migracao ou contrato OpenAPI;
- deploy, Oracle, rollback, backup ou observabilidade;
- integracao externa com webhook ou credencial sensivel.

## Gates por risco

| Risco                | Gate minimo                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| Docs apenas          | `git diff --check`, Prettier e `quality:scope:strict`                  |
| API simples          | typecheck/lint/teste focado, contratos e secrets                       |
| Web/PWA              | typecheck/lint/teste focado e, se UI, screenshot/viewport              |
| Realtime/performance | smoke REST + smoke mobile/realtime quando ambiente permitir            |
| Pagamento/seguranca  | threat model consultado, teste negativo, contratos, secrets e rollback |
| Release              | `ops:readiness --strict`, branch sincronizada e Actions executando     |

Durante bloqueio externo do GitHub Actions por billing, substitua temporariamente a evidencia remota por:

```powershell
npm run quality:offline-release -- --profile standard
```

Anexe `.cache/offline-release/latest.md` ao PR/registro da entrega e escreva explicitamente: "validado localmente, CI remoto bloqueado por billing". Isso nao equivale a CI verde.

## Evidencia minima de colaboracao

Mesmo quando houver apenas um mantenedor:

- trabalhar em commits pequenos e nomeados;
- usar issues para tarefas com risco;
- registrar RFCs para mudancas de arquitetura;
- manter PR template completo;
- anexar logs de validacao ou caminho de relatorio;
- documentar risco residual sem maquiar.

## Definition of done

Uma entrega nao esta pronta se:

- CI remoto nao rodou por bloqueio externo e isso nao foi explicitado;
- worktree esta sujo;
- contrato publico mudou sem doc;
- hot path de PWA/realtime mudou sem teste ou smoke;
- seguranca foi tocada sem teste negativo;
- deploy foi feito a partir de `working-tree` sem emergencia documentada.

## Como isso melhora a avaliacao tecnica

Este workflow cria evidencias que recrutador, tech lead ou revisor consegue auditar:

- tomada de decisao;
- manutencao de qualidade;
- disciplina operacional;
- seguranca por processo;
- comunicacao tecnica;
- capacidade de dividir trabalho.
