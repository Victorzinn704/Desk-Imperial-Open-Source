# Runbook de Staging, Incidente e Rollback

## Objetivo

Centralizar o fluxo operacional minimo para:

1. validar staging antes de promover;
2. responder incidente com triagem objetiva;
3. executar rollback com evidência.

## 1. Checklist de staging

Antes de promover qualquer release:

- confirmar workflow `CI` verde no mesmo SHA
- rodar `npm run quality:preflight` no branch final
- validar ambiente com `Postgres` e `Redis` ativos
- conferir `ALERTMANAGER_WEBHOOK_URL` no ambiente alvo
- abrir dashboards:
  - `Desk Imperial - OSS Observability Overview`
  - `Desk Imperial - Business Observability`

## 2. Smoke mínimo em staging

Executar e registrar:

- login owner
- login staff
- abrir comanda
- adicionar item
- validar atualização da cozinha
- fechar comanda
- validar KPI/resumo no owner
- validar logout e sessão

## 3. Triagem de incidente

Quando houver incidente:

1. identificar escopo:
   - auth
   - operations
   - finance
   - infra/plataforma
2. confirmar impacto no usuário:
   - indisponibilidade total
   - degradação parcial
   - dados inconsistentes
3. abrir evidências:
   - workflow/commit implantado
   - logs do backend
   - dashboards Grafana
   - alertas Prometheus/Alertmanager
4. classificar decisão:
   - mitigar em produção
   - rollback imediato
   - monitorar com owner definido

## 4. Gatilhos de rollback

Fazer rollback imediato quando houver:

- erro de login/sessão em massa
- falha no fluxo de abrir/fechar comanda
- KPI/resumo com inconsistência confirmada
- p95 funcional sustentado acima dos thresholds de alerta sem mitigação rápida
- falha crítica de build/startup pós deploy

## 5. Procedimento de rollback

1. congelar novas promoções
2. identificar último SHA saudável
3. promover rollback da release anterior
4. validar health checks
5. rerodar smoke mínimo conforme criticidade
6. registrar:
   - SHA revertido
   - horário
   - motivo
   - evidências
   - próximo owner

## 6. Encerramento do incidente

Antes de encerrar:

- confirmar estabilidade por métricas e smoke
- anexar timeline curta
- abrir item corretivo se a causa raiz não foi eliminada
- atualizar `review_audit/` quando o baseline técnico mudar
