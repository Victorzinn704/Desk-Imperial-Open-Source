# Scorecard de Maturidade - Desk Imperial

**Data:** 2026-04-14
**Escala:** `0` inexistente - `5` excelencia

---

| Dimensao            | Score | Leitura objetiva                                                                                                               |
| ------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------ |
| Arquitetura         | 2.9/5 | Macroestrutura boa, mas onboarding/auth e shells operacionais ainda concentram muita regra                                     |
| Backend             | 3.3/5 | Authz, auditoria e integridade subiram bastante, mas ainda ha acoplamento e hotspots longos                                    |
| Frontend            | 3.1/5 | Shells mobile ficaram mais coerentes em reconnect/offline/erro, mas owner offline e cobertura ainda sao lacuna                 |
| Seguranca           | 3.2/5 | Falha severa de authz foi removida, porem governanca de secrets e cobertura de risco ainda pedem continuidade                  |
| DevOps / Plataforma | 3.2/5 | build/preflight estao verdes; release criteria e runbook base melhoraram, mas DR e validacao sintetica de alertas ainda faltam |
| Observabilidade     | 3.2/5 | dashboards de negocio e alertas de latencia entraram no baseline, mas entrega real e Sonar continuam com lacunas               |
| Testes              | 3.3/5 | regressao automatizada cobriu as correcoes profundas, mas coverage global ainda distorce o risco real                          |
| Documentacao        | 3.2/5 | release criteria e runbook operacional ficaram executaveis, mas backup/restore e exercicio em ambiente ainda faltam            |
| DX                  | 3.2/5 | preflight forte e contratos estaveis; warnings altos e hotspots mantem custo de mudanca elevado                                |
| UX/UI Operacional   | 3.1/5 | estados enganosos diminuiram, mas ainda falta um modelo offline consistente para toda a operacao                               |
| Performance         | 3.0/5 | build e runtime estao estaveis, mas mobile ainda tem fetch duplo e hotspots pesados                                            |
| Governanca tecnica  | 3.0/5 | guardrails voltaram a refletir o branch, mas Sonar e coverage seguem abaixo do necessario                                      |
| Produto             | 3.4/5 | o escopo segue forte e mais seguro para operar, mas a excelencia ainda depende de observabilidade e governanca                 |

---

## Pontos Fortes Confirmados

1. `typecheck`, `build`, `test:critical`, `quality:preflight` e `test:coverage:sonar` passaram.
2. correcoes profundas foram acompanhadas por testes de regressao backend e frontend.
3. authz de perfil, auditoria de ator real e integridade de estoque sairam da zona critica.
4. shells mobile ficaram mais honestos em reconnect, erro, offline e busy state.
5. dashboards de negocio, alertas basicos de latencia e runbook operacional passaram a existir no baseline versionado.

## Fatores que ainda derrubam a maturidade

1. Sonar/warnings seguem altos e o servidor local de Sonar continua indisponivel nesta sessao.
2. owner mobile ainda nao tem um contrato offline tao robusto quanto o staff.
3. a entrega real dos alertas e o restore operacional ainda nao foram validados.
4. a cobertura web continua em `69.11%` e o lote full de coverage depende de Redis real no backend.
5. arquitetura continua concentrando muito fluxo em poucos arquivos.

---

## Sintese

Maturidade geral estimada: **3.3/5**.

Leitura pratica: o projeto saiu de um patamar de **risco funcional alto com P0 reais** para um patamar de **base operacional confiavel, com observabilidade e governanca documental melhores**, porem ainda com debito estrutural e de qualidade estatica relevante. Ele ja nao merece nota de branch quebrado; tambem ainda nao merece nota de excelencia.
