# Matriz de Riscos — Desk Imperial

**Data:** 2026-04-10  
**Escala:** impacto `1-5` x probabilidade `1-5`  
**Esforço:** `Baixo` / `Médio` / `Alto`

---

| ID | Risco | Domínio | Impacto | Prob. | Score | Esforço | Prioridade |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `AUD-001` | Build do web quebrado na rota raiz | Frontend / Release | 5 | 5 | 25 | Baixo | P0 |
| `AUD-004` | Segredos operacionais em texto puro | Segurança / Infra | 5 | 4 | 20 | Baixo-Médio | P0 |
| `AUD-003` | Cancelamento de pedido restaura estoque em duplicidade sob concorrência | Backend / Dados | 5 | 4 | 20 | Médio | P0 |
| `AUD-006` | Dependências de runtime vulneráveis em produção | Segurança / Supply chain | 4 | 4 | 16 | Médio | P1 |
| `AUD-010` | Rollback fraco por migration no boot + force-recreate | Infra / Release | 5 | 3 | 15 | Médio-Alto | P1 |
| `AUD-005` | Sessão de staff arquivado continua válida por cache | Backend / AuthZ | 4 | 3 | 12 | Médio | P1 |
| `AUD-011` | Backup/DR ausente | Infra / Continuidade | 5 | 2 | 10 | Médio | P1 |
| `AUD-008` | Backend E2E fora da CI | QA / Release safety | 4 | 3 | 12 | Médio | P1 |
| `AUD-009` | Cobertura do web superestima confiança | QA / Governança | 4 | 3 | 12 | Médio | P1 |
| `AUD-007` | CSV export vulnerável a formula injection | Frontend / Segurança funcional | 4 | 3 | 12 | Baixo | P1 |
| `AUD-012` | SSH sem verificação de host | Infra / Segurança | 4 | 3 | 12 | Baixo | P1 |
| `AUD-015` | Acoplamento `operations`/`products`/`finance` aumenta blast radius | Arquitetura | 4 | 3 | 12 | Alto | P1 |
| `AUD-014` | Ciclo `auth`/`consent`/`geocoding` | Arquitetura | 4 | 3 | 12 | Alto | P1 |
| `AUD-016` | Troca de moeda não invalida caches monetários | Backend / Consistência | 3 | 4 | 12 | Baixo-Médio | P2 |
| `AUD-018` | CSRF por `Referer` aceita prefixo | Segurança | 3 | 3 | 9 | Baixo | P2 |
| `AUD-019` | Roteamento `/app` depende do cliente | Frontend / UX | 3 | 3 | 9 | Médio | P2 |
| `AUD-020` | E2E web não cobre fluxos operacionais | QA / Produto | 4 | 2 | 8 | Médio | P2 |
| `AUD-021` | Documentação principal em drift | DX / Governança | 3 | 4 | 12 | Médio | P2 |
| `AUD-023` | Alertas e correlação de observabilidade ainda são parciais | SRE / Observabilidade | 3 | 3 | 9 | Médio | P3 |

---

## Top 10 Riscos

1. `AUD-001` — build do web quebrado
2. `AUD-004` — segredos plaintext
3. `AUD-003` — cancelamento com corrida de estoque
4. `AUD-006` — dependências vulneráveis em runtime
5. `AUD-010` — rollback fraco
6. `AUD-005` — sessão revogada continua válida
7. `AUD-008` — backend E2E fora da CI
8. `AUD-009` — cobertura enganosa no web
9. `AUD-015` — corredor de acoplamento operacional/financeiro
10. `AUD-021` — documentação principal em drift

---

## Leitura da Matriz

- O risco mais urgente é a quebra real de build em `AUD-001`, porque o estado atual do branch não gera artefato válido de frontend.
- A segunda faixa crítica é operacional: `AUD-004`, `AUD-010`, `AUD-011` e `AUD-012` mostram que a infraestrutura detecta falhas, mas ainda não recupera nem protege segredos de forma madura.
- O núcleo funcional de maior risco fica em pedidos, sessão e finanças: `AUD-003`, `AUD-005`, `AUD-006`, `AUD-016`.
