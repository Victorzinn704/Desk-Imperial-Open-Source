# Scorecard de Maturidade — Desk Imperial

**Data:** 2026-04-10  
**Escala:** `0` inexistente · `5` excelência

---

| Dimensão | Score | Leitura objetiva |
| --- | ---: | --- |
| Arquitetura | 2.5/5 | Forma macro boa, mas com ciclos e acoplamento estrutural relevantes |
| Backend | 3.0/5 | Base sólida em NestJS/Prisma, porém com problemas reais de integridade, cache e autorização |
| Frontend | 2.5/5 | Design system razoável, mas build quebrado, home client-only e roteamento crítico no cliente |
| Segurança | 2.5/5 | Fundamentos fortes, mas segredos plaintext, vulns de runtime e vazamentos em logs derrubam a nota |
| DevOps / Plataforma | 2.5/5 | CI útil e observável, porém rollback, backup/DR e SSH ainda são frágeis |
| Observabilidade | 3.5/5 | Stack ampla e bem instrumentada, mas correlação e alertas de produto/segurança ainda incompletos |
| Testes | 2.5/5 | Quantidade alta, mas cobertura/gates desbalanceados e pouca proteção E2E operacional |
| Documentação | 2.5/5 | Existe bastante material, mas há drift material nas fontes principais |
| DX | 3.0/5 | Monorepo, scripts e tooling são bons; previsibilidade sofre com docs desalinhadas e cobertura crítica ainda desigual |
| UX/UI | 3.0/5 | Boa base visual, mas rotas críticas com spinner/redirect client-side e affordances incompletas |
| Performance | 3.0/5 | Há preocupação com cache, queries escopadas e virtualização, mas ainda existem groupBy sem contenção e hotspots grandes |
| Governança técnica | 2.5/5 | Há disciplina parcial, porém CI, segredos e documentação canônica ainda não fecham o ciclo |
| Produto | 3.5/5 | Proposta forte e coerente com o público-alvo; os principais gaps estão na confiabilidade da entrega |

---

## Pontos Fortes Reais

1. Stack full-stack moderna e consistente
2. Observabilidade implantada de ponta a ponta em código
3. Pipeline já possui lint, typecheck, testes, audit e latency gate
4. Domínio de produto claro e com valor operacional concreto
5. Migrations Prisma versionadas e health endpoints implementados

## Fatores que mais derrubam a maturidade

1. Build real do web quebrado no estado atual do branch
2. Segredos plaintext e rollback/DR fracos
3. Problemas confirmados de integridade e autorização no backend
4. Estratégia de testes mais ampla do que efetiva nas áreas críticas
5. Drift documental suficiente para induzir decisão errada

## Síntese

Maturidade geral estimada: **2.8/5**.

Leitura prática: o projeto já passou da fase de protótipo e tem boa densidade técnica, mas ainda não está em nível de excelência operacional. O gargalo principal hoje não é construir novas features; é **fechar o ciclo entre código, pipeline, docs e operação real**.
