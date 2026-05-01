# Observabilidade vm2 — Fechamento OTEL

## 2026-04-24

## Resultado

- `vm2` oficial validada como `147.15.60.224`.
- WireGuard ativa na `vm2` oficial como `10.220.10.2`.
- Prometheus na `vm2` oficial com `15/15` targets `up`.
- API em `vm1` apontando OTEL para Alloy privado em `http://10.220.10.2:4318`.
- Grafana, Prometheus, Loki, Tempo, Alertmanager, Metabase e Sonar permanecem presos em `127.0.0.1` na `vm2`.
- Alloy recebe OTEL apenas pelo WireGuard em `10.220.10.2:4317/4318`.

## Correções aplicadas

1. Identificada confusão operacional entre:
   - `vm2` oficial: `147.15.60.224`
   - A1 extra da Lohana: `134.65.240.222`
2. Stack duplicada de observabilidade na A1 extra da Lohana foi parada sem remover volumes.
3. Peer WireGuard direto `vm1 <-> vm2` foi adicionado:
   - `vm1`: `10.220.10.1/32`
   - `vm2`: `10.220.10.2/32`
4. Rotas `/32` foram aplicadas via `wg0`.
5. Firewall da `vm2` foi aberto somente para OTEL privado:
   - `10.220.10.1 -> 10.220.10.2:4318/tcp`
   - `10.220.10.1 -> 10.220.10.2:4317/tcp`
6. `apps/api/.env` de produção recebeu:
   - `OTEL_EXPORTER_OTLP_ENDPOINT=http://10.220.10.2:4318`
   - `OTEL_SERVICE_NAME=desk-imperial-api`
   - `OTEL_SERVICE_ENVIRONMENT=production`
   - `OTEL_TRACES_SAMPLE_RATE=0.03`
   - `OTEL_METRICS_EXPORT_INTERVAL_MS=15000`
7. `desk-api` foi recriado e voltou saudável.

## Validação

- `https://api.deskimperial.online/api/v1/health`: `200`.
- `desk-api`: `healthy`.
- Health interno da API: `dbHealthy=true`, `redisHealthy=true`.
- Container da API consegue abrir TCP em `10.220.10.2:4318`.
- Prometheus: `15` targets totais, `15` `up`, `0` `down`.
- Tempo recebeu traces da API durante validação com sample temporário `1`.
- Sample rate de produção foi restaurado para `0.03`.

## Segurança

- Nenhuma porta de Grafana/Prometheus/Sonar foi aberta publicamente.
- A ingestão OTEL não usa IP público.
- A regra de firewall adicionada é específica para `vm1 -> vm2` via WireGuard.
- A A1 extra da Lohana ficou sem stack operacional ativa para evitar superfície duplicada.

## Próximos cuidados

- Não usar `134.65.240.222` como observabilidade sem alterar antes o mapa canônico.
- Toda execução de deploy/ops deve validar `vm2=147.15.60.224`.
- Se a API passar a emitir volume alto de traces, manter `OTEL_TRACES_SAMPLE_RATE` baixo em produção.
