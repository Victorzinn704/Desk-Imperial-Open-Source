# Plano de Hardening de Observabilidade e Governanca

Data: 2026-04-02  
Objetivo: fechar os gaps reais da stack de monitoramento do Desk Imperial sem reescrever o que ja esta bom

---

## 1. Retrato atual

Hoje o projeto ja tem uma base boa de observabilidade e governanca:

- API com OpenTelemetry OTLP opt-in
- logs estruturados com `nestjs-pino`
- `requestId` em toda requisicao HTTP
- trilha de auditoria persistida em banco para acoes sensiveis
- stack OSS local com `Alloy + Tempo + Loki + Prometheus + Alertmanager + Grafana + Blackbox`
- frontend com Grafana Faro integrado ao runtime

O problema nao e falta de stack. O problema e maturidade desigual entre as camadas:

- backend e audit trail estao mais maduros
- dashboards e alertas existem, mas ainda estao muito focados em infraestrutura
- Faro no browser esta integrado no codigo, mas o caminho de ingestao ainda nao esta fechado dentro do stack local do repositorio
- Alertmanager sobe, mas ainda nao entrega alerta para nenhum destino real

---

## 2. Principios de decisao

- preservar o que ja funciona
- endurecer primeiro o que reduz risco de incidente real
- nao tratar Faro como substituto de issue tracking
- diferenciar telemetria de infraestrutura, telemetria de produto e trilha de auditoria
- evitar mais coleta antes de fechar ingestao, dashboards e notificacao

---

## 3. Agora

## A1 - Fechar o caminho real de ingestao do frontend

Diagnostico:
- o frontend ja envia sinais via Faro, mas o repositorio ainda nao provisiona um collector browser-to-backend completo no stack OSS local.

Evidencia tecnica:
- `apps/web/lib/observability/faro.ts` depende de `NEXT_PUBLIC_FARO_COLLECTOR_URL`
- `.env.example` deixa `NEXT_PUBLIC_FARO_COLLECTOR_URL` vazio
- `infra/docker/docker-compose.observability.yml` nao sobe nenhum servico dedicado a ingestao Faro

Impacto no produto:
- erros de browser podem parecer instrumentados, mas nao chegam de forma consistente a uma trilha operacional confiavel.

Recomendacao pratica:
- definir um caminho oficial unico:
  - opcao preferencial: receiver self-hosted compativel com Faro dentro da stack OSS
  - fallback aceitavel: collector externo dedicado, com CSP e variaveis padronizadas
- se a versao atual do Alloy suportar o receiver desejado com seguranca, incorporar isso ao stack local
- se nao suportar com o desenho atual, subir um receiver/proxy dedicado e documentado

Prioridade:
- P0

Risco de nao agir:
- falsa sensacao de cobertura no frontend e perda de erro real em producao

---

## A2 - Ligar alertas a um destino real

Diagnostico:
- Alertmanager esta provisionado, mas sem canal de notificacao operacional.

Evidencia tecnica:
- `infra/docker/observability/alertmanager/alertmanager.yml` usa apenas receiver `default` sem integracao externa

Impacto no produto:
- alerta dispara no Prometheus/Grafana, mas nao acorda ninguem.

Recomendacao pratica:
- configurar ao menos um destino de release:
  - webhook corporativo
  - Slack
  - email tecnico
- classificar severidade minima:
  - `critical`: disponibilidade e auth
  - `warning`: degradacao de scrape, latencia ou collector

Prioridade:
- P0

Risco de nao agir:
- stack “verde no dashboard” mas sem resposta operacional quando quebrar

---

## A3 - Padronizar os checks de ambiente

Diagnostico:
- a stack sobe, mas o probe HTTP da API depende do backend local em `:4000`; se a API nao estiver de pe, os alertas ficam em firing e o sinal vira ruido.

Evidencia tecnica:
- `infra/docker/observability/prometheus/prometheus.yml` aponta `desk-api-health` para `http://host.docker.internal:4000/api/health`

Impacto no produto:
- fica dificil diferenciar “stack quebrada” de “app local nao iniciado”.

Recomendacao pratica:
- documentar dois modos:
  - modo stack-only
  - modo stack + app local
- adicionar um smoke simples que valide:
  - compose up
  - API local respondendo
  - blackbox `probe_success = 1`

Prioridade:
- P0

Risco de nao agir:
- alerta em falso e perda de confianca nos paineis

---

## 4. Antes do lancamento

## B1 - Subir dashboards de produto e nao so de infraestrutura

Diagnostico:
- os dashboards provisionados hoje estao centrados em saude do stack e do probe HTTP.

Evidencia tecnica:
- dashboard base atual cobre health, firing alerts e disponibilidade dos componentes

Impacto no produto:
- a lideranca tecnica nao enxerga rapidamente degradacao de login, operacao, realtime ou fluxo PDV.

Recomendacao pratica:
- criar dashboards versionados para:
  - auth: falha/sucesso, latencia, throttling
  - operations: `live`, `kitchen`, handshake realtime
  - PDV/comanda: abertura, envio, fechamento, taxa de erro
  - browser: excecoes, erros de API cliente, requests lentas

Prioridade:
- P1

Risco de nao agir:
- operacao quebra em fluxo de negocio sem aparecer claramente no painel principal

---

## B2 - Criar metricas de negocio no backend

Diagnostico:
- hoje a API exporta telemetria automatica, mas ainda nao tem conjunto claro de metricas de produto/RED por fluxo critico.

Evidencia tecnica:
- a documentacao atual ja aponta “adicionar metricas de negocio (RED) no backend” como proxima fase

Impacto no produto:
- fica dificil medir saude real de auth, operacao e PDV alem do healthcheck.

Recomendacao pratica:
- instrumentar metricas explicitas para:
  - login success/failure
  - request duration por endpoint critico
  - open/close de comanda
  - erros de realtime publish/subscribe
  - cache hit/miss em fluxos sensiveis

Prioridade:
- P1

Risco de nao agir:
- gargalos de produto viram investigacao manual em incidente

---

## B3 - Fechar correlacao ponta a ponta

Diagnostico:
- `requestId`, Pino, OTel e Faro existem, mas a correlacao entre browser, API, logs e auditoria ainda nao esta tratada como fluxo oficial de suporte.

Evidencia tecnica:
- backend ja devolve `x-request-id`
- frontend ja captura `requestId` nos eventos API
- audit logs vivem em trilha separada no banco

Impacto no produto:
- o time consegue rastrear incidentes, mas com mais atrito do que o necessario.

Recomendacao pratica:
- padronizar consulta operacional:
  - browser error -> `requestId`
  - trace -> span HTTP
  - log estruturado -> request
  - audit log -> acao de negocio
- documentar um playbook de investigacao

Prioridade:
- P1

Risco de nao agir:
- troubleshooting mais lento em horario de pico

---

## 5. Depois do lancamento

## C1 - Telemetria de UX e performance percebida

Diagnostico:
- o projeto ja mede parte da latencia, mas ainda pode amadurecer observabilidade de experiencia percebida.

Impacto no produto:
- melhora a capacidade de ver degradacao antes de virar reclamacao do usuario.

Recomendacao pratica:
- acompanhar:
  - erro de hidratacao
  - requests lentas no browser
  - falhas de socket/reconexao
  - shell readiness por perfil (`OWNER`, `STAFF`)

Prioridade:
- P2

Risco de nao agir:
- manutencao mais reativa do que preventiva

---

## C2 - Retencao, custo e politicas de dados

Diagnostico:
- a stack ja coleta, mas ainda precisa de politica clara de retencao e custo por sinal.

Impacto no produto:
- risco de crescimento de ruido, custo operacional e storage sem criterio.

Recomendacao pratica:
- definir:
  - retencao de logs
  - retencao de traces
  - retencao de audit logs
  - labels proibidas de alta cardinalidade
  - politicas de sampling por ambiente

Prioridade:
- P2

Risco de nao agir:
- stack cresce sem governanca e passa a doer mais do que ajudar

---

## 6. O que manter como esta

- `nestjs-pino` com redaction e `requestId`
- OTel opt-in na API com sampling conservador
- audit log em banco para acoes sensiveis
- CSP validando origem do collector do frontend
- hardening do Faro no cliente:
  - dedupe
  - throttle
  - sampling
  - sanitizacao de path

---

## 7. O que nao compensa mexer agora

- trocar toda a stack de observabilidade
- remover Faro do frontend
- reescrever logs de auditoria para fora do banco
- adicionar ferramentas de issue tracking como substituto de telemetria

Faro aqui deve ser tratado como sensor de browser, nao como sistema completo de gestao de incidente.

---

## 8. Ordem de execucao sugerida

Semana 1:
- A1
- A2
- A3

Semana 2:
- B1
- B2

Semana 3:
- B3
- C1 baseline

Semana 4:
- C2
- hardening de retencao e custo

---

## 9. Criterio de pronto

Consideramos a trilha de observabilidade pronta para release quando:

- API envia traces/logs/metricas para Alloy de forma validada
- frontend tem collector Faro real e testado
- blackbox probe deixa de depender de ajuste manual confuso
- alertas `critical` chegam a um destino real
- Grafana mostra pelo menos:
  - infra
  - auth
  - operations
  - frontend/browser
- existe playbook de investigacao usando `requestId`
