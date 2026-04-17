# Matriz de Riscos - Desk Imperial

**Data:** 2026-04-14
**Escala:** impacto `1-5` x probabilidade `1-5`
**Esforco:** `Baixo` / `Medio` / `Alto`

---

## Riscos Ativos

| ID | Risco | Dominio | Impacto | Prob. | Score | Esforco | Prioridade |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `AUD-301` | Sonar local indisponivel e cobertura web em `69.11%`; lote full ainda depende de Redis real | Qualidade / Entrega | 4 | 5 | 20 | Medio | P1 |
| `AUD-305` | Latencia funcional entrou em config, mas entrega real e alertas de erro ainda nao foram validados | SRE / Operacao | 4 | 3 | 12 | Medio | P1 |
| `AUD-315` | Outbox offline inconsistente entre owner e staff | Frontend / Operacao | 4 | 4 | 16 | Medio-Alto | P1 |
| `AUD-308` | Cobertura web voltou a incluir owner-mobile/realtime, mas o total ainda fica abaixo do gate | QA / Governanca | 4 | 3 | 12 | Medio | P1 |
| `AUD-314` | Ciclo `auth`/`consent`/`geocoding` | Arquitetura | 3 | 4 | 12 | Medio-Alto | P1 |
| `AUD-313` | Baseline de warnings segue alto em hotspots | Manutenibilidade | 3 | 4 | 12 | Medio-Alto | P2 |
| `AUD-325` | Mobile ainda paga fetch duplo e hydration swap | Frontend / Performance | 3 | 4 | 12 | Medio | P2 |
| `AUD-328` | Hotspots concentram shell, estado e regra em poucos arquivos | Arquitetura / Manutenibilidade | 3 | 4 | 12 | Alto | P2 |
| `AUD-312` | Backup/DR ausente no runtime Oracle | Infra / Resiliencia | 5 | 2 | 10 | Medio | P2 |

---

## Riscos Mitigados em 2026-04-14

| ID | Mitigacao observada | Evidencia principal |
| --- | --- | --- |
| `AUD-302` | webhook passou a ser obrigatorio em producao no codigo versionado | `infra/oracle/ops/alertmanager/render-config.sh` |
| `AUD-304` | dashboards de negocio passaram a existir nas stacks versionadas | `infra/docker/observability/grafana/dashboards/business-observability-overview.json` |
| `AUD-309` | release criteria foi alinhado ao workflow `CI` | `docs/release/release-criteria-2026-03-28.md` |
| `AUD-310` | runbook de staging/incidente/rollback foi publicado | `docs/operations/staging-incident-rollback-runbook.md` |
| `AUD-316` | `STAFF` nao consegue mais alterar perfil do owner/workspace | `apps/api/src/modules/auth/auth.service.ts` |
| `AUD-317` | auditoria/feed distinguem ator real do owner | `apps/api/src/modules/monitoring/audit-log.service.ts` |
| `AUD-319` | cancelamento volta a restaurar estoque para pedidos de comanda | `apps/api/src/modules/orders/orders.service.ts` |
| `AUD-311` | caches monetarios e derivados sao invalidados apos update de perfil | `apps/api/src/modules/auth/auth.service.ts` |
| `AUD-318` | cache de sessao revalida expiracao e remove piso artificial de TTL | `apps/api/src/modules/auth/auth-session.service.ts` |
| `AUD-321` | confirmacao offline do staff agora espera persistencia real | `apps/web/components/staff-mobile/staff-mobile-shell.tsx` |
| `AUD-323` | reconnect passou a refazer baseline | `apps/web/components/operations/use-operations-realtime.ts` |
| `AUD-324` | mobile separou `loading/error/offline/empty` | `apps/web/components/staff-mobile/*.tsx`, `apps/web/components/owner-mobile/owner-comandas-view.tsx` |
| `AUD-326` | `isBusy` agora protege acoes destrutivas relevantes | `apps/web/components/staff-mobile/mobile-comanda-list.tsx`, `apps/web/components/owner-mobile/owner-comandas-view.tsx` |
| `AUD-327` | patch realtime nao subconta mais `openComandasCount` | `apps/web/lib/operations/operations-realtime-patching.ts` |

---

## Top 8 Riscos Ativos

1. `AUD-301` - Sonar e coverage seguem fora do alvo e sem baseline local confiavel
2. `AUD-315` - owner/staff ainda nao compartilham um contrato offline coerente
3. `AUD-305` - SLO funcional entrou no baseline, mas ainda falta validar entrega real
4. `AUD-308` - cobertura nao protege adequadamente a superficie operacional mobile
5. `AUD-314` - onboarding/auth continua com boundary estrutural fragil
6. `AUD-313` - warning baseline continua alto nos hotspots principais
7. `AUD-312` - backup/restore segue sem ritual testado
8. `AUD-328` - hotspots estruturais continuam concentrando shell, estado e regra
