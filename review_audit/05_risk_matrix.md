# Matriz de Risco — Desk Imperial (2026-04-26)

## Top 15 Riscos por Impacto × Probabilidade × Esforço

| # | ID | Risco | Impacto | Probabilidade | Esforço | Score |
|---|---|---|---|---|---|---|
| 1 | AUD-403 | Alertmanager sem notificação — incidentes não detectados | Crítico | Alta | S | **P0** |
| 2 | AUD-402 | Circular deps: auth↔consent↔geocoding | Alto | Alta | M | **P0** |
| 3 | AUD-408 | User enumeration em 3 endpoints auth | Alto | Alta | S | **P1** |
| 4 | AUD-409 | Sem rate limit no registro | Médio | Média | S | **P1** |
| 5 | AUD-410 | TOCTOU em pagamento comanda | Alto | Média | S | **P1** |
| 6 | AUD-412 | TOCTOU em closeCashClosure | Alto | Média | S | **P1** |
| 7 | AUD-401 | Zero testes backend | Crítico | Alta | XL | **P0** |
| 8 | AUD-406 | DashboardShell monolítico 665 linhas | Médio | Alta | M | **P1** |
| 9 | AUD-411 | Sem idempotência em endpoints | Alto | Média | M | **P1** |
| 10 | AUD-413 | Tracing distribuído quebrado | Médio | Alta | M | **P1** |
| 11 | AUD-404 | God service comanda 1377 linhas | Alto | Alta | L | **P1** |
| 12 | AUD-405 | Sem Suspense/loading.tsx | Médio | Alta | M | **P1** |
| 13 | AUD-407 | useMobileDetection sem debounce | Médio | Alta | S | **P1** |
| 14 | AUD-414 | Logs de negócio fora do pino/Loki | Médio | Alta | M | **P1** |
| 15 | AUD-415 | 7 FKs sem índices | Médio | Alta | S | **P1** |

## Mapa de Calor

```
                      Probabilidade
                      Baixa    Média    Alta
Impacto   Crítico     —        AUD-401  AUD-403
          Alto        —        AUD-410  AUD-402
                                AUD-411  AUD-404
                                AUD-412  AUD-408
          Médio       —        AUD-409  AUD-405
                                         AUD-406
                                         AUD-407
                                         AUD-413
                                         AUD-414
                                         AUD-415
          Baixo       (vários   —        —
                      P2/P3)
```

## Risco Sistêmico Dominante

**O maior risco do projeto não é um bug individual — é a combinação de:**
1. Zero testes de backend (P0) +
2. God service de 1377 linhas (P1) +
3. Circular deps que impedem testes isolados (P0) +
4. Alertas que não chegam a ninguém (P0)

Isso significa que o deploy atual está "voando cego": qualquer refatoração ou nova feature pode quebrar produção sem detecção, e sem que o dev saiba a tempo de reagir. A operação atual depende 100% de o dev solo não errar e de os usuários reportarem problemas.

## Ações de Mitigação Imediata (48h)

1. AUD-403: Configurar webhook Alertmanager (1h)
2. AUD-408: Unificar mensagens de erro auth (30min)
3. AUD-409: Adicionar rate limit no registro (15min)
