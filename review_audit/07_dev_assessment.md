# Avaliação do Desenvolvedor Solo — Desk Imperial (2026-04-26)

**Método:** leitura técnica do artefato (código, infra, docs), não julgamento pessoal.

---

## Notas por Dimensão (0–5)

| Dimensão                         | Nota    | Evidência                                                                                                                                                                                                                        |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domínio de TS/JS                 | **4.0** | Zero `@ts-ignore`, apenas 2 `@ts-expect-error`, 54 `any` em 105k linhas. TypeScript typecheck passa. Uso de generics, narrowing, tipo discriminado nos contracts.                                                                |
| Domínio de framework (Next/Nest) | **3.5** | Uso idiomático de ambos. NestJS: módulos bem separados, guards, interceptors, pipes. Next.js: App Router, dynamic imports 25+. Mas: 57% client components (alto), zero loading.tsx, zero Suspense real.                          |
| Modelagem de domínio             | **3.5** | 22 modelos Prisma bem normalizados. Entidades de negócio claras (Comanda, Order, Product, CashSession). Linguagem ubíqua no schema. Mas: aggregate roots difusos em operations.                                                  |
| Arquitetura de sistema           | **3.0** | Monorepo bem estruturado, contracts package, separação API/Web. Mas: circular deps (3), god service, cross-module leakage (38 imports). Decisões conscientes visíveis mas não documentadas como ADRs formais.                    |
| Segurança aplicada               | **4.0** | Cookie \_\_Host- prefix, Argon2id, CSRF double-submit com timing-safe compare, CORS restritivo, HTTPS enforcement, helmet, rate limiting. Vulnerabilidades npm zeradas. Gaps: enumeração de usuário, sem rate limit no registro. |
| Testabilidade                    | **2.0** | Frontend: bons testes com vitest, co-localizados. Backend: zero testes co-localizados, 0% coverage nos módulos. Código testável com NestJS DI, mas não testado. Mocks repetitivos (780+ jest.fn()).                              |
| Performance consciente           | **2.5** | next/dynamic usado para 25 componentes pesados. TanStack Query caching configurado. Mas: recalculaCashSession em cada pagamento, sem paginação em snapshot, useMobileDetection sem debounce.                                     |
| Operabilidade                    | **3.5** | Health checks reais (SELECT 1, Redis PING). Docker multi-stage. Backup criptografado com restore testado. Mas: Alertmanager sem canal, logs de negócio não vão para Loki, tracing distribuído quebrado.                          |
| Maturidade de dev                | **3.5** | Commits atômicos significativos. Código consistente. 131 docs. CHANGELOG mantido. CONTRIBUTING, SECURITY, CODE_OF_CONDUCT presentes. Mas: ROADMAP stale, ROADMAP vs CHANGELOG divergentes.                                       |
| Auto-crítica embutida            | **3.0** | `pin-rate-limiter.ts` explicitamente marcado @deprecated. Hooks de fail-open documentados. Mas: 855 warnings ESLint acumulados, sem plano visível de redução.                                                                    |

---

## Veredito de Senioridade

**Pleno-Sênior (3-5 anos equivalentes), tendendo a Sênior.**

Justificativa:

- **Segurança é nível Sênior claro.** Cookie hardening, CSRF timing-safe, Argon2id, CORS restritivo, zero vulns npm. Isso não é checklist copiado — é compreensão real de AppSec.
- **Infra é nível Sênior.** Docker multi-stage, CI de 8 jobs, backup com restore testado, 5-VM strategy com VPN. Muito acima do esperado para dev pleno.
- **TypeScript é Sênior.** Zero @ts-ignore, type-safe contracts, narrowing correto.
- **O que puxa para Pleno:** Arquitetura com circular deps e god service (típico de quem constrói rápido sem pausa para refatorar). Testes negligenciados no backend (típico de dev fullstack que prioriza feature sobre qualidade). Performance não é prioridade consciente.

**Sinal de contratabilidade:** Forte. Um dev com este portfólio aplicando para Pleno/Sênior seria contratado em qualquer empresa brasileira. Para Sênior em big tech, precisaria mostrar capacidade de refatoração estrutural (quebrar o god service, resolver circular deps) e cultura de teste — lacunas que este repositório expõe.

---

## 3 Forças Técnicas Reais

1. **Profundidade de stack incomum para dev solo.** Domina do Docker ao React, do Prisma ao Prometheus, do CSRF ao backup. Raros devs solo têm essa amplitude com qualidade consistente.
2. **Disciplina de segurança real, não cosmética.** Cookie \_\_Host-, Argon2id, timing-safe compare para CSRF. Isso demonstra leitura de specs, não copy-paste de tutorial.
3. **Operabilidade de produção.** Health checks reais, backup com restore testado, CI gate de performance (k6). Não é comum em projeto solo — a maioria para no "funciona na minha máquina".

## 3 Gaps Prioritários

1. **Cultura de teste assimétrica.** Frontend coberto (69%), backend deserto. Isso revela que teste foi tratado como "importante para o front" mas não como disciplina universal. É o gap que mais limita a evolução do projeto.
2. **Acumulação de débito estrutural sem refatoração.** 1377 linhas em um serviço, 3 circular deps, 855 warnings ESLint. O padrão é "construir rápido, não parar para arrumar". Para um dev solo, isso é compreensível mas perigoso — a dívida cresce exponencialmente.
3. **Observabilidade incompleta.** A stack está provisionada (impressionante), mas a última milha falta: Alertmanager sem canal, Faro é stub, logs de negócio não ingeridos. O investimento em provisionar sem completar a entrega é um padrão recorrente (ver também: design-lab pages sem Suspense real, backup configurado mas DR runbook ausente).
