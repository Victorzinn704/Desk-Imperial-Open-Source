# PRD - DESK IMPERIAL RELEASE V3

Data: 2026-04-01  
Status: Proposta executavel para liberacao real

---

## 1. Contexto

O produto ja possui base funcional madura em operacao, financeiro, seguranca e realtime. O objetivo deste PRD nao e inventar novo produto, e sim conduzir uma liberacao real com risco controlado.

Este PRD substitui a logica de backlog especulativo por escopo de release orientado a evidencia de codigo.

---

## 2. Objetivo de negocio

Liberar o Desk Imperial para uso real ampliado com confiabilidade operacional, seguranca aplicada e governanca minima de qualidade.

Resultado esperado:

- reducao de incidentes em fluxo critico de salao
- aumento de previsibilidade em deploy
- confianca de time e stakeholders para escala gradual

---

## 3. Nao objetivos (fora desta release)

- reescrever arquitetura base
- migrar stack principal
- criar app nativo separado
- construir modulo novo sem evidencia de necessidade imediata

---

## 4. Publico e uso critico

## 4.1 Owner

- acompanha KPI executivo
- gerencia produtos, equipe e fechamento
- autoriza acoes sensiveis via PIN

## 4.2 Staff

- opera mesa/comanda/cozinha
- depende de baixa latencia e confiabilidade de sincronizacao

Fluxo critico transversal:

- abrir comanda -> adicionar itens -> cozinha -> fechar comanda -> refletir em resumo executivo

---

## 5. Metricas de sucesso da release

## 5.1 Qualidade tecnica

- 100% dos gates obrigatorios de CI verdes em PR e main
- nenhuma regressao em fluxo critico de salao no smoke de release
- zero falha bloqueante em auth/sessao/CSRF no smoke

## 5.2 Operacao

- atualizacao de comanda refletida em canal realtime em tempo util
- fechamento de comanda refletido no resumo executivo sem divergencia manual

## 5.3 Seguranca

- cobertura de hardening aplicada para endpoints de custo sensivel
- dependencia vulneravel high/critical bloqueada no gate de PR

---

## 6. Requisitos de release

## 6.1 Requisito R1 - Gate de qualidade full-stack

Descricao:

- pipeline principal deve validar backend e frontend antes de merge

Aceite:

- lint + typecheck backend/web
- testes backend
- testes frontend (unit + e2e baseline)
- build monorepo

## 6.2 Requisito R2 - Hardening de seguranca residual

Descricao:

- eliminar exposicoes de alto impacto que ainda nao estao no nivel ideal de release

Aceite:

- endpoint de insight IA protegido por semantica de mutacao (POST + CSRF)
- criterio de seguranca documentado e rastreavel

## 6.3 Requisito R3 - Robustez de operacao realtime

Descricao:

- manter confiabilidade operacional em variacao de rede

Aceite:

- reconnect e fallback de invalidacao funcionando nos shells owner/staff
- sem perda silenciosa de atualizacao em fluxo critico validado por smoke

## 6.4 Requisito R4 - PWA operacional consistente

Descricao:

- elevar confiabilidade do modo instalavel mobile

Aceite:

- service worker versionado por release
- comportamento offline minimamente previsivel para modulo /app
- limites documentados para areas fora da cobertura offline

## 6.5 Requisito R5 - Cobertura de testes frontend ampliada

Descricao:

- reduzir risco de regressao em componentes de alto impacto

Aceite:

- casos owner/staff autenticados para fluxo operacional minimo
- validacao de regressao em shell mobile e navegacao executiva

## 6.6 Requisito R6 - Documentacao de operacao de release

Descricao:

- tornar release repetivel por qualquer engenheiro do time

Aceite:

- README alinhado ao estado real
- DOCS consolidado por codigo atual
- mapa real e plano de lapidacao publicados
- parecer final com condicao objetiva de go/no-go

---

## 7. Prioridades

- P0: R1, R2, R3
- P1: R4, R5
- P2: R6 (deve sair junto para governanca)

---

## 8. Dependencias

- Redis ativo em staging/producao
- ambiente de CI com Node 22 e npm lock sincronizado
- variaveis de seguranca de producao (COOKIE_SECRET/CSRF_SECRET)

---

## 9. Riscos e mitigacoes

## Risco A - Regressao em fluxo operacional

Mitigacao:

- smoke manual obrigatorio + testes automatizados focados

## Risco B - Divergencia entre realtime e leitura executiva

Mitigacao:

- validar evento de fechamento e atualizacao de resumo no mesmo ciclo de smoke

## Risco C - Pipeline nao barrar problema de frontend

Mitigacao:

- incluir frontend no gate principal de CI

## Risco D - comportamento PWA inconsistente entre navegadores

Mitigacao:

- explicitar limite funcional por navegador e usar fallback de reconexao

---

## 10. Plano de entrega sugerido

## Fase 1 (semana 1)

- consolidar docs
- ativar pipeline de gate full-stack
- executar baseline de testes e corrigir quebras

## Fase 2 (semana 2)

- hardening de endpoint IA
- melhorias de PWA/versionamento de cache
- ampliar smoke e casos de frontend criticos

## Fase 3 (semana 3)

- freeze de release
- rodada final de smoke
- aprovacao go/no-go com parecer tecnico

---

## 11. Criterio de Go/No-Go

Go:

- todos os gates obrigatorios verdes
- smoke operacional completo sem falha bloqueante
- riscos residuais classificados como aceitaveis e documentados

No-Go:

- falha em auth/sessao/CSRF
- falha em fluxo comanda/cozinha/fechamento
- divergencia de resumo executivo apos fechamento

---

## 12. Encerramento

Este PRD define uma release de consolidacao, nao de exploracao. A estrategia e manter o que ja funciona, fechar lacunas de confiabilidade e liberar com disciplina tecnica.
