# Riscos e Limitacoes — Desk Imperial

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01  
**Honestidade:** este documento nao suaviza os problemas reais.

---

## Como ler este documento

Cada item traz:

- **Severidade:** Alta / Media / Baixa
- **Tipo:** Limitacao de produto / Debito tecnico / Risco operacional / Risco de seguranca
- **Status:** Conhecido e aceito / Em correcao / Planejado / Fora do escopo

---

## Limitacoes de produto

### L-01 — Sem integracao com marketplaces de delivery

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Limitacao de produto |
| Status | Fora do escopo atual |

O Desk Imperial ainda nao integra iFood, Rappi ou agregadores parecidos. O produto continua mais forte em atendimento presencial e operacao local.

**Impacto:** negocios com alto volume de delivery ainda precisam registrar parte do fluxo manualmente.

### L-02 — Multiunidade continua fora do modelo principal

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Limitacao de produto |
| Status | Fora do escopo atual |

Cada workspace representa um negocio operacional unico. Filiais seguem exigindo contas ou separacao operacional externa.

### L-03 — Relatorios self-service ainda sao limitados

| Campo | Valor |
| --- | --- |
| Severidade | Baixa |
| Tipo | Limitacao de produto |
| Status | Planejado |

O projeto ja tem schema `bi` e Metabase, mas o portal ainda nao oferece construcao self-service de relatorios dentro da propria UI.

**Impacto:** dashboards executivos existem, mas personalizacao profunda ainda nao e parte da superficie principal do produto.

---

## Debito tecnico

### D-01 — Cobertura frontend ainda e parcial

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Debito tecnico |
| Status | Conhecido e aceito |

O repo melhorou bastante em testes criticos, mas a superficie web/mobile ainda e maior do que a cobertura automatizada atual.

**Impacto:** regressao visual e comportamental ainda pode escapar em areas menos quentes.

### D-02 — Consistencia realtime ainda esta em recuperacao

| Campo | Valor |
| --- | --- |
| Severidade | Alta |
| Tipo | Debito tecnico |
| Status | Em correcao |

A malha realtime ja recebeu:

- rooms segmentadas
- `operations.error`
- reconnect/foreground mais explicito
- negative cache de sessao

Mesmo assim, ainda existe debito estrutural em:

- correlacao optimistic -> real
- ordering por entidade
- replay/gap detection
- custo do hot path antes do emit

**Impacto:** latencia percebida e divergencia cliente/servidor ainda podem aparecer em operacao quente.

### D-03 — Hotspots operacionais seguem caros para manutencao

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Debito tecnico |
| Status | Conhecido e aceito |

Arquivos como `comanda.service.ts` e parte do patching realtime ainda concentram regra demais.

**Impacto:** mudancas em caixa, comanda e cozinha ainda exigem revisao cuidadosa e testes focados.

---

## Riscos operacionais

### O-01 — Runtime publico segue sem alta disponibilidade real

| Campo | Valor |
| --- | --- |
| Severidade | Alta |
| Tipo | Risco operacional |
| Status | Conhecido e aceito |

O projeto ainda nao opera em arquitetura ativa-ativa nem em multi-borda com failover automatico.

Estado atual:

- `vm-free-01` segura a borda publica
- `vm-free-02` segura builder/ops
- Ampere segura o banco

**Impacto:** falha grave em `vm-free-01` ainda derruba a superficie publica mesmo com o resto da malha em pe.

### O-02 — Dependencias externas continuam sem fallback simetrico

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Risco operacional |
| Status | Parcialmente mitigado |

Servicos externos atuais:

| Servico | Uso | Comportamento atual |
| --- | --- | --- |
| PostgreSQL + PgBouncer (Ampere) | Persistencia | Critico; sem fallback equivalente |
| Redis | Cache, rate limit, parte do realtime | fail-open controlado, mas com perda de eficiencia e resiliencia |
| Brevo | Email transacional | sem fallback automatico |
| Gemini | smart draft e insight IA | erro controlado; nao bloqueia o core transacional |
| Open Food Facts | lookup por EAN | erro controlado; cadastro continua manual |
| Telegram API | bot oficial | degradacao localizada; operacao principal continua |
| Sentry | observabilidade de erro/release | perda de visibilidade, nao de funcionalidade core |

### O-03 — Observabilidade melhorou, mas ainda nao e "fim de jogo"

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Risco operacional |
| Status | Em correcao |

Hoje ja existem:

- OpenTelemetry na API
- Faro no frontend
- Sentry em API e web
- health checks publicos
- probes e alertas no stack Oracle

O risco residual nao e mais "zero observabilidade". O risco agora e governanca:

- ruido demais em alguns sinais
- runbooks ainda sendo consolidados
- alertas e dashboards ainda mais fortes em infraestrutura do que em fluxo de produto

---

## Riscos de seguranca conhecidos

### S-01 — Alertas de seguranca ainda nao estao completos por evento de negocio

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Risco de seguranca |
| Status | Planejado |

Tentativas de abuso e eventos sensiveis ja entram em audit log, mas a malha de notificacao/alerta ainda nao cobre todo o espectro de seguranca operacional.

**Impacto:** um padrao anomalo pode ser percebido tarde demais sem revisao ativa dos logs e dashboards.

### S-02 — Segredos de build exigem disciplina operacional forte

| Campo | Valor |
| --- | --- |
| Severidade | Media |
| Tipo | Risco de seguranca |
| Status | Controlado com guardrails |

O web agora usa `SENTRY_AUTH_TOKEN` no build para release/sourcemaps. Isso resolveu observabilidade, mas introduz um segredo de build que precisa de higiene real.

**Impacto:** token exposto em conversa, host ou CI vira incidente de seguranca e deve ser rotacionado.

### S-03 — API docs continuam configuraveis em producao

| Campo | Valor |
| --- | --- |
| Severidade | Baixa |
| Tipo | Risco de seguranca |
| Status | Controlado |

`/api/v1/docs` nao sobe por padrao em producao, mas pode ser habilitado por env.

**Impacto:** exposicao acidental do contrato se a variavel operacional for mal configurada.

---

## Debito de documentacao

| Item | Status |
| --- | --- |
| Fontes canonicas de entrada | Corrigido |
| Produto / realtime / auth / local dev | Corrigido |
| Deploy / banco / user flows | Corrigido |
| Troubleshooting residual | Em consolidacao |
| Docs historicos de release | Mantidos como historico, nao como fonte primaria |

---

## Politica de atualizacao

Este documento deve ser revisado quando:

- um risco deixa de existir
- um risco muda de severidade
- um novo servico externo entra no caminho critico
- o runtime muda de forma relevante
- a malha realtime sair da fase atual de recuperacao estrutural
