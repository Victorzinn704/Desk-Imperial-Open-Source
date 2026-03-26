## O que foi feito

<!--
  Descreva as mudanças em 2–4 linhas. Responda: O que mudou? Por quê mudou agora?
  Evite descrever "o que o código faz" — isso está no diff. Foque no "por quê".
-->

## Tipo de mudança

- [ ] Bug fix (mudança não-breaking que corrige um problema)
- [ ] Feature (mudança não-breaking que adiciona funcionalidade)
- [ ] Breaking change (fix ou feature que quebra comportamento existente)
- [ ] Refactoring (sem mudança funcional, melhora de estrutura ou legibilidade)
- [ ] Infra / CI / Configuração

## Checklist

### Qualidade
- [ ] `npm run lint` — zero erros
- [ ] `npm run typecheck` — zero erros
- [ ] `npm run test` — todos passando
- [ ] `npm run build` — build limpo

### Segurança
- [ ] Nenhum secret ou credencial foi adicionado ao código
- [ ] Inputs de usuário são sanitizados com `sanitizePlainText()` ou equivalente
- [ ] Endpoints novos têm `SessionGuard` e `CsrfGuard` aplicados
- [ ] Queries filtram por `companyOwnerId` (workspace isolation)

### Banco de dados (se aplicável)
- [ ] Migration criada com `prisma migrate dev`
- [ ] Migration é reversível ou tem plano de rollback documentado
- [ ] Indexes foram revisados para os novos campos

### Cache (se aplicável)
- [ ] Mutações chamam `invalidate*Cache(userId)` correspondente
- [ ] Novos dados cacheáveis foram adicionados ao `CacheService`

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
