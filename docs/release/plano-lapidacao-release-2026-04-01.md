# Plano de Lapidacao para Release Real

Data: 2026-04-01  
Objetivo: reduzir risco de liberacao sem reescrever o produto

---

## 1. Metodo de priorizacao

- P0: bloqueia release ampla
- P1: nao bloqueia, mas aumenta risco operacional relevante
- P2: melhoria estrutural para sustentabilidade

Cada item traz:
- diagnostico
- evidencia tecnica
- impacto de produto
- recomendacao pratica
- risco de inacao

---

## 2. Backlog priorizado

## P0-1 - Gate de CI sem cobertura frontend completa

Diagnostico:
- pipeline principal valida backend, mas ainda nao trata frontend como gate de release equivalente.

Evidencia tecnica:
- workflow principal executa lint/typecheck/test/build com foco backend no job de teste.
- testes web existem (Vitest e Playwright), mas nao estao no gate principal de merge.

Impacto de produto:
- regressao visual/funcional em fluxo web pode chegar a producao com gate verde.

Recomendacao pratica:
- adicionar jobs dedicados para web unit e web e2e baseline no CI principal.

Risco de inacao:
- aumento de incidentes em login/navegacao/shell operacional apos merge.

---

## P0-2 - Endpoint de insight IA com semantica GET

Diagnostico:
- endpoint de insight gera custo externo e processamento, mas opera em GET.

Evidencia tecnica:
- modulo market-intelligence exposto em rota GET para geracao de insight.

Impacto de produto:
- acionamento indevido aumenta custo e ruido operacional.

Recomendacao pratica:
- migrar para POST com CSRF, mantendo cache por foco para preservar performance.

Risco de inacao:
- risco financeiro e operacional por disparos involuntarios.

---

## P0-3 - Cobertura operacional de release ainda dependente de smoke manual

Diagnostico:
- fluxo critico de salao e robusto, mas parte da garantia final ainda e manual.

Evidencia tecnica:
- existe suite automatizada, porem sem cobertura total ponta-a-ponta autenticada owner/staff para todos os cenarios de operacao real.

Impacto de produto:
- regressao em fluxo caixa/comanda/cozinha pode escapar para producao.

Recomendacao pratica:
- formalizar smoke automatizado de fluxo minimo:
  - login owner
  - login staff
  - abrir comanda
  - adicionar item
  - refletir cozinha
  - fechar comanda
  - refletir KPI executivo

Risco de inacao:
- perda de confianca operacional e incidentes em horario de pico.

---

## P1-1 - PWA/offline parcial

Diagnostico:
- existe manifest, SW e fila offline, mas cobertura e concentrada no modulo /app.

Evidencia tecnica:
- registrador de service worker no layout mobile especifico.
- SW com cache simples e versao estatica manual.

Impacto de produto:
- experiencia instalavel funciona, mas com previsibilidade limitada fora da trilha principal.

Recomendacao pratica:
- instituir versionamento de cache por release.
- documentar claramente escopo offline suportado.
- ampliar testes de comportamento offline no modulo operacional.

Risco de inacao:
- comportamento inconsistente entre versoes e dispositivos.

---

## P1-2 - Complexidade concentrada no hook de realtime web

Diagnostico:
- um unico hook concentra conexao, patch e reconciliacao de multiplos snapshots.

Evidencia tecnica:
- arquivo de realtime do frontend esta entre os maiores do repositorio e acumula responsabilidades.

Impacto de produto:
- manutencao mais lenta, maior chance de regressao em mudancas de evento.

Recomendacao pratica:
- extrair em modulos por dominio:
  - patch live
  - patch kitchen
  - patch summary
  - estrategia de fallback

Risco de inacao:
- custo crescente de evolucao e correcoes.

---

## P1-3 - Contradicao de produto no fluxo de importacao CSV

Diagnostico:
- endpoint de importacao foi desligado, mas logica permanece no service.

Evidencia tecnica:
- controller retorna 410 no endpoint de importacao.
- service ainda contem regras de importacao.

Impacto de produto:
- confusao de roadmap e manutencao desnecessaria.

Recomendacao pratica:
- decidir explicitamente entre:
  - reativar com hardening e testes
  - remover logica residual e atualizar documentacao

Risco de inacao:
- divida tecnica e ambiguidade funcional.

---

## P2-1 - Normalizacao de performance em componentes grandes

Diagnostico:
- varios componentes concentram volume alto de codigo e regras de renderizacao.

Evidencia tecnica:
- shells mobile, landing e componentes de salao/realtime aparecem como hotspots de tamanho.

Impacto de produto:
- piora de onboarding de dev e risco de regressao de performance em mudancas.

Recomendacao pratica:
- particionar por subcomponentes de dominio e hooks de estado dedicados.
- manter dynamic import para modulos pesados de baixa frequencia.

Risco de inacao:
- degradacao progressiva de manutenibilidade.

---

## P2-2 - Consolidacao de governanca documental

Diagnostico:
- havia documentos com informacoes antigas e divergentes do codigo atual.

Evidencia tecnica:
- versoes antigas misturavam referencias de stack/arquitetura que nao representam o estado atual.

Impacto de produto:
- decisao tecnica orientada por documento incorreto.

Recomendacao pratica:
- manter uma trilha unica de documentos vivos:
  - README
  - DOCS consolidado
  - PRD ativo
  - plano de release

Risco de inacao:
- retrabalho e desalinhos de planejamento.

---

## 3. Ordem de execucao sugerida

Semana 1:
- P0-1, P0-2, P0-3

Semana 2:
- P1-1, P1-2, P1-3

Semana 3:
- P2-1, P2-2 e freeze de release

---

## 4. Criterio de conclusao da lapidacao

A lapidacao e considerada concluida quando:
- todos os itens P0 estiverem fechados
- nenhum item P1 tiver risco nao aceito para o contexto da liberacao
- trilha documental estiver sincronizada com o codigo
