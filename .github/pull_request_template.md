## O que foi feito

<!--
  Descreva as mudanças em 2–4 linhas. Responda: O que mudou? Por quê mudou agora?
  Evite descrever "o que o código faz" — isso está no diff. Foque no "por quê".
-->

## Intenção e escopo

- Problema resolvido:
- Usuário/fluxo afetado:
- Fora do escopo:

## Tipo de mudança

- [ ] Bug fix (mudança não-breaking que corrige um problema)
- [ ] Feature (mudança não-breaking que adiciona funcionalidade)
- [ ] Breaking change (fix ou feature que quebra comportamento existente)
- [ ] Refactoring (sem mudança funcional, melhora de estrutura ou legibilidade)
- [ ] Performance / realtime / PWA
- [ ] Segurança / hardening
- [ ] Infra / CI / Configuração

## Superfícies tocadas

- [ ] API / contrato HTTP
- [ ] Web/PWA
- [ ] Banco / Prisma / migration
- [ ] Redis / cache / realtime
- [ ] Pagamento / webhook / impressão
- [ ] Telegram / notificações
- [ ] Documentação apenas

## Code Health Budget

- Arquivos que não podem piorar:
- Estratégia de extração usada ou motivo para não extrair:
- Funções/componentes que exigem atenção:

## Checklist

### Qualidade

- [ ] `npm run quality:scope:strict`
- [ ] `npm run quality:contracts`
- [ ] lint/typecheck/testes focados executados
- [ ] build ou smoke executado quando aplicável

### Segurança

- [ ] Nenhum secret ou credencial foi adicionado ao código
- [ ] Inputs de usuário são sanitizados com `sanitizePlainText()` ou equivalente
- [ ] Endpoints novos têm `SessionGuard` e `CsrfGuard` aplicados
- [ ] Queries filtram por `companyOwnerId` (workspace isolation)
- [ ] Fluxo crítico consultou `docs/security/threat-model-critical-flows.md`
- [ ] Teste negativo adicionado ou justificativa registrada

### Banco de dados (se aplicável)

- [ ] Migration criada com `prisma migrate dev`
- [ ] Migration é reversível ou tem plano de rollback documentado
- [ ] Indexes foram revisados para os novos campos

### Cache (se aplicável)

- [ ] Mutações chamam `invalidate*Cache(userId)` correspondente
- [ ] Novos dados cacheáveis foram adicionados ao `CacheService`

### Operação (se aplicável)

- [ ] `npm run ops:readiness -- --strict --report .cache/operational-readiness.md`
- [ ] rollback ou fallback documentado
- [ ] GitHub Actions verificado ou bloqueio externo declarado

## Como testar

<!--
  Passos mínimos para validar o comportamento alterado.
  Inclua: endpoint, payload de exemplo, resultado esperado.
-->

1.
2.

## Notas para o revisor

<!--
  Decisões de design não óbvias, trade-offs aceitos, áreas de atenção.
  Deixe em branco se não houver nada além do óbvio.
-->

## Risco residual

Liste o que ainda não foi possível validar, especialmente dependências externas, mobile real, Oracle, webhook real ou hardware local.
