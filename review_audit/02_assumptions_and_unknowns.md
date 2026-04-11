# Hipóteses, Incertezas e Lacunas — Desk Imperial

**Data:** 2026-04-10

---

## Fatos Confirmados

1. Monorepo com `apps/api`, `apps/web`, `packages/types`, `infra/`.
2. Migrations Prisma versionadas (`24` diretórios).
3. Health endpoints presentes no backend.
4. CSP presente tanto na API quanto no web.
5. CI executa `npm audit`, mas não faz gate de build do web.
6. O build real do web está quebrado hoje.
7. Há seis relatórios especializados concluídos em `review_audit/agents/`.

---

## Hipóteses Fechadas nesta Rodada

1. **“Não há migrations no repo”**  
   Fechada como falsa.
2. **“CSP da API está desabilitado”**  
   Fechada como falsa.
3. **“Não existe health endpoint”**  
   Fechada como falsa.
4. **“CI não executa audit”**  
   Fechada como falsa.

---

## Itens Ainda Não Verificáveis Diretamente

1. estado real de produção no Railway
2. estado real do banco Neon
3. estado real do Redis de produção
4. dashboards/alertas externos ativos em Grafana/Alertmanager
5. política real de rotação de segredos fora do repositório

---

## Incertezas Residuais

1. O alcance prático da falha de `Referer` no CSRF depende de cenários reais sem `Origin`.
2. O impacto operacional exato do `groupBy` financeiro depende de cardinalidade real de tenants grandes.
3. O custo/pressão de memória da stack de observabilidade depende de retenção e ingestão reais na `vm-free-02`.

---

## Regra para Leitura destes Artefatos

Qualquer item não confirmado por:

- código atual,
- execução técnica,
- ou relatório especializado desta rodada

deve ser tratado como hipótese e nunca como fato consolidado.
