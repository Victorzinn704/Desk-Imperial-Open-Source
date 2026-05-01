# Suposições e Lacunas — Desk Imperial (2026-04-26)

## Suposições Confirmadas (pela leitura do código)

1. **Monorepo npm workspaces + Turborepo** — Confirmado em `package.json:7-10` e `turbo.json`
2. **NestJS 11 + Prisma 6 + Next.js 16 + React 19** — Confirmado nos package.json
3. **Autenticação via cookie HttpOnly** — Confirmado em `auth-session.service.ts` e `auth.controller.ts`
4. **LGPD com versionamento de consentimento** — Confirmado módulo `consent/` existe
5. **Redis com fail-open** — Confirmado em cache service (logs mostram "Cache desligado permanentemente via Fail Open" quando Redis ausente)
6. **Socket.IO para realtime operacional** — Confirmado módulo `operations-realtime/`
7. **Testes críticos rodando e passando** — Confirmado via execução
8. **Zero vulnerabilidades npm audit** — Confirmado

## Suposições/Hipóteses a Validar

1. **[Hipótese] Prisma 7 migration** — O projeto está em Prisma 6.19.3 com Prisma 7.8 disponível. Supõe-se que o upgrade foi adiado por quebra de API ou risco funcional.
2. **[Hipótese] Cobertura de testes do backend** — Não foi possível medir nesta passada devido à falha no `npm run test:coverage` (Redis). A cobertura real pode ser maior ou menor que 69%.
3. **[Hipótese] Deploy usa Railway** — `railway.json` na raiz e `apps/web/railway.json` sugerem deploy via Railway. A config exata de produção não foi inspecionada.
4. **[Hipótese] Oracle Cloud para observabilidade** — `infra/oracle/ops/` sugere stack OTel no Oracle Cloud. Não confirmado se é produção ativa.
5. **[Hipótese] Ambientes separados** — `.env.example`, `.env.local`, `.env.container.example` sugerem dev/local/container. Não se sabe se staging existe.
6. **[Hipótese] Backup e DR** — Não foram encontrados scripts/testes de backup/restore automatizados no repo. Pode existir fora do repositório.

## Lacunas Identificadas (ações bloqueadas pela Regra Zero)

1. **[BLOQUEADO] Execução de `npm run test:coverage` completo** — O backend falha no smoke test por dependência de Redis. Seria necessário um Redis real para medir cobertura total. Registrado como lacuna.
2. **[BLOQUEADO] Análise de bundle size** — O comando `next build --profile` ou `analyze` não foi executado porque exigiria build completo adicional. Registrado para a Fase 3.
3. **[BLOQUEADO] SonarQube** — Inacessível localmente ("fetch failed" no quality:warnings). Impossível obter métricas históricas de qualidade.
4. **[BLOQUEADO] `npx madge`** — Não disponível no ambiente. Análise de dependências circulares seria útil.
5. **[BLOQUEADO] `npx depcheck` / `npx knip`** — Não instalados. Análise de dead code e dependências não usadas seria útil.
6. **[BLOQUEADO] Testes E2E Playwright** — Não executados (demandariam servidor rodando). Registrados como lacuna.
7. **[BLOQUEADO] Docker build** — Não executado para evitar uso excessivo de recursos. Pode ser feito na Fase 3 se necessário.

## Contexto do Dev Solo

O repositório é mantido por um único desenvolvedor. Isso informa a calibração de severidade e esforço:

- Um achado "médio" num time de 5 pode ser "alto" num time de 1 (não há par para revisar)
- Refatorações grandes custam mais porque não há ninguém para tocar outras entregas
- Consistência de código é mais difícil porque não há code review externo
- Mas a profundidade de domínio do dev solo é maior (conhece todas as camadas)
