# Gate de Estabilizacao Antes de Novas Features

**Data:** 2026-04-12  
**Status:** ativo  
**Escopo:** codigo atual do PC, nao o snapshot Oracle  
**Objetivo:** controlar, testar e estabilizar o Desk Imperial antes de abrir nova leva de funcionalidades no site/app.

---

## 1. Decisao de Trabalho

Enquanto este gate estiver ativo, novas features grandes ficam em espera.

Permitido agora:

1. Recuperar logica perdida e proteger contratos publicos.
2. Corrigir bugs silenciosos e riscos de integridade.
3. Reduzir code smell com testes e commits pequenos.
4. Aumentar cobertura onde ela protege fluxo real.
5. Preparar o mobile e o PDV para redesign incremental.
6. Documentar decisoes que evitam refatoracao cega.

Bloqueado por enquanto:

1. Criar novas areas grandes no site.
2. Fazer redesign amplo sem teste cobrindo fluxo atual.
3. Remover codigo por "parecer morto" sem contrato, teste ou comparacao.
4. Misturar arquivo gerado, doc externa e mudanca funcional no mesmo commit.
5. Fazer refatoracao de god file sem facade, teste e rollback simples.

---

## 2. Definicao de Pronto Para Voltar a Adicionar Coisas

So devemos entrar em nova leva de produto quando os itens abaixo estiverem verdadeiros.

| Area             | Criterio minimo                                                          | Status atual                 |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------- |
| Worktree         | `git status --short` limpo antes e depois do preflight                   | atendido na ultima validacao |
| Guardrails       | `quality:scope:strict`, `quality:contracts` e `quality:preflight` verdes | atendido                     |
| Build            | web e API buildando localmente                                           | atendido                     |
| Testes criticos  | `npm run test:critical` verde                                            | atendido                     |
| Contratos Oracle | exports web, rotas API e membros publicos criticos sem perda             | atendido                     |
| Lint errors      | `0` erros                                                                | atendido                     |
| Lint warnings    | plano por cluster e reducao incremental                                  | pendente                     |
| Sonar real       | scan com `SONAR_HOST_URL`, `SONAR_TOKEN` e Java 21                       | pendente                     |
| Coverage web     | owner mobile incluido ou script dedicado criado                          | pendente                     |
| Coverage API     | smoke Redis separado de suite comum e E2E documentado                    | pendente                     |
| Bugs criticos    | integridade/autorizacao/seguranca corrigidas e cobertas                  | pendente                     |
| Mobile           | fluxo staff/owner protegido antes de nova cara                           | pendente                     |
| UI operacional   | plano aprovado para minimizar telas sem remover logica                   | pendente                     |

---

## 3. Comandos Oficiais do Gate

Rodar antes de qualquer commit funcional:

```powershell
npm run quality:scope:strict
npm run quality:contracts
npm run quality:preflight
```

Rodar antes de fechar uma frente maior:

```powershell
npm run quality:preflight:full
```

Rodar quando mexer em mobile/web critico:

```powershell
npm --workspace @partner/web run test
npm --workspace @partner/web run test:e2e:critical
npm --workspace @partner/web run build
```

Rodar quando mexer em backend critico:

```powershell
npm --workspace @partner/api run test -- --testPathIgnorePatterns=be-01-operational-smoke.spec.ts
npm --workspace @partner/api run build
```

Observacao: o smoke real com Redis/Postgres deve ser tratado como trilha separada ate a infra local estar ativa.

---

## 4. Protocolo de Commit

Cada commit deve ter uma intencao unica.

| Tipo             | Conteudo permitido                                           | Nao misturar com               |
| ---------------- | ------------------------------------------------------------ | ------------------------------ |
| Guardrail        | scripts de qualidade, package scripts, docs de processo      | feature ou refatoracao runtime |
| Recuperacao      | logica restaurada, wrappers de contrato, testes de regressao | limpeza estetica ampla         |
| Bugfix           | correcao comportamental + teste que protege o bug            | redesign ou renomeacao visual  |
| Limpeza mecanica | imports, chaves, formatacao, sort simples                    | mudanca de regra de negocio    |
| Refatoracao      | extracao com facade e comportamento igual                    | alteracao de UX ou endpoint    |
| UI incremental   | uma tela/superficie com teste e screenshot                   | refatoracao backend            |
| Doc              | plano, runbook, decisao tecnica                              | codigo runtime sem necessidade |

Arquivos gerados ou suspeitos devem passar por revisao explicita antes de commit.

---

## 5. Lotes de Estabilizacao

### Lote 0 — Higiene do Repositorio

Objetivo: impedir que sujeira local vire regressao.

Checklist:

1. Manter `quality:scope:strict` verde.
2. Nao trabalhar por cima de arquivo desconhecido.
3. Revisar stashes pendentes antes de esquecer contexto.
4. Evitar commit com `apps/api/nest-cli.json` sem confirmar necessidade.
5. Verificar se `next-env.d.ts` nao volta a sujar apos `next build`.

Saida esperada:

1. Worktree limpo.
2. Stash pendente documentado ou descartado com decisao.
3. Commits pequenos e rastreaveis.

### Lote 1 — Recuperacao e Contratos

Objetivo: garantir que nada primordial foi descartado por falso "codigo morto".

Checklist:

1. Manter comparacao contra `.cache/oracle-source-*`.
2. Proteger `apps/web/lib/api.ts` como barrel publico.
3. Proteger rotas de controllers da API.
4. Proteger membros publicos de `ComandaService`, `OperationsHelpersService` e `ProductsService`.
5. Adicionar teste sempre que restaurar helper ou wrapper publico.

Saida esperada:

1. `npm run quality:contracts` verde.
2. Registro claro do que foi restaurado.
3. Nenhum wrapper publico removido sem prova de ausencia de uso.

### Lote 2 — Code Smell com Seguranca

Objetivo: reduzir warnings sem repetir o corte prematuro de logica.

Prioridade:

1. `no-non-null-assertion`.
2. `no-nested-ternary`.
3. `complexity`.
4. `max-lines-per-function`.
5. `max-params`.
6. `max-lines`.

Regra de ataque:

1. Corrigir por cluster, nao por arquivo aleatorio.
2. Comecar por funcoes puras e helpers com teste.
3. Em service critico, preferir facade delegando para helper novo.
4. Nao mudar assinatura publica sem teste de contrato.
5. Rodar preflight ao fim de cada lote.

Primeiros alvos recomendados:

1. `apps/web/lib/operations/operations-realtime-patching.ts`.
2. `apps/api/src/modules/operations/comanda.service.ts`.
3. `apps/api/src/modules/operations/operations-helpers.service.ts`.
4. `apps/web/components/staff-mobile/staff-mobile-shell.tsx`.
5. `apps/web/components/owner-mobile/owner-mobile-shell.tsx`.

### Lote 3 — Bugs Silenciosos e Integridade

Objetivo: corrigir riscos que podem deixar dado errado sem erro visivel.

Prioridade minima:

1. Cancelamento concorrente de pedido nao pode restaurar estoque duas vezes.
2. Staff arquivado nao pode continuar operando via cache de sessao.
3. Troca de moeda deve invalidar caches monetarios.
4. CSV financeiro deve bloquear formula injection.
5. Logs nao devem expor documento, OTP ou segredo operacional.
6. CSRF por origem deve ser revisado sem dependencia fragil de prefixo.

Regra:

1. Todo bug critico precisa de teste que falha antes e passa depois.
2. Toda correcao de integridade deve estar dentro de transacao ou ter idempotencia clara.
3. Toda correcao de autorizacao deve cobrir OWNER e STAFF.

### Lote 4 — Testes, Coverage e Sonar

Objetivo: transformar a cobertura em protecao real, nao numero bonito.

Checklist:

1. Rodar Sonar real com Java 21 e credenciais locais/CI.
2. Criar baseline de warnings por regra e por pasta.
3. Criar ou ajustar script de coverage para mobile.
4. Incluir `components/owner-mobile/**` em trilha de cobertura.
5. Separar smoke Redis/Postgres da suite comum.
6. Colocar API E2E com Postgres/Redis efemeros na CI.
7. Evitar testes "coverage boost" que nao afirmam comportamento.

Metas iniciais:

1. API manter cobertura alta sem depender de Redis real.
2. Web subir cobertura de areas operacionais antes de redesenhar.
3. Mobile staff/owner ter testes de fluxo, nao apenas render.

### Lote 5 — Mobile Antes da Nova Cara

Objetivo: preparar `/app/staff` e `/app/owner` para evoluir sem quebrar operacao.

Checklist:

1. Ler `tab` da URL em `/app/staff?tab=...` e `/app/owner?tab=...`.
2. Proteger atalhos do PWA com teste.
3. Extrair orchestration dos shells grandes para hooks menores.
4. Criar E2E mobile minimo:
   - login staff;
   - abrir mesa;
   - adicionar item;
   - enviar cozinha;
   - fechar comanda.
5. Criar cobertura owner mobile antes de redesenhar.

Saida esperada:

1. Mobile atual protegido.
2. Novo visual pode entrar por partes.
3. Menos chance de bug silencioso em offline/realtime.

### Lote 6 — UI Operacional Minimizando Ruido

Objetivo: diminuir excesso de informacao nas telas sem remover logica.

Direcao aprovada:

1. Admin real, compacto e funcional.
2. Preto/branco/cinza com azul de acao.
3. Sem landing/showcase dentro do app.
4. Sem cards gigantes de apresentacao.
5. Acoes principais no mesmo nivel visual.

Mudancas planejadas:

1. `Adicionar produto` vira botao.
2. Ao clicar, abre o formulario atual em painel/modal com visual coerente com PDV.
3. `Fazer venda` vira `Venda localizada` quando o fluxo tiver localizacao e campos ricos.
4. Venda comum continua sendo a venda do PDV.
5. `Adicionar produto`, `Venda localizada` e `Abrir comanda` ficam no mesmo nivel hierarquico.

Regra:

1. Primeiro teste de comportamento.
2. Depois mudanca visual.
3. Depois screenshot/responsividade.
4. Depois preflight.

---

## 6. Ordem Recomendada de Execucao

1. Fechar higiene do repo e revisar stash pendente.
2. Rodar `quality:preflight:full` uma vez como baseline amplo.
3. Corrigir bugs criticos de integridade e seguranca.
4. Criar trilha de coverage mobile/owner.
5. Reduzir warnings por cluster nos hot files.
6. Rodar Sonar real e registrar baseline.
7. Aplicar UI operacional minimizada.
8. Revalidar mobile e PDV.
9. Abrir nova leva de features.

---

## 7. Como Medir Progresso

| Indicador       | Meta antes de novas features                       |
| --------------- | -------------------------------------------------- |
| Worktree        | limpo ao final de cada sessao                      |
| Preflight       | verde sem deixar diff                              |
| Lint errors     | `0`                                                |
| Lint warnings   | queda por cluster, sem aumento em arquivos tocados |
| Contratos       | `quality:contracts` verde                          |
| Coverage mobile | owner/staff em trilha coberta                      |
| API E2E         | smoke com infra separado e documentado             |
| Bugs criticos   | P0/P1 de integridade e seguranca fechados          |
| Sonar           | baseline real gerado e plano de reducao registrado |
| UI              | mudancas pequenas, testadas e com rollback facil   |

---

## 8. Regra Final

Nova feature so entra quando ela puder responder sim para estas perguntas:

1. O comportamento antigo esta protegido?
2. O preflight passa antes e depois?
3. O commit e pequeno o bastante para revisar?
4. A mudanca nao mistura UI, backend, docs e limpeza mecanica?
5. Existe teste para o risco principal?
6. Se der errado, da para reverter sem derrubar outras frentes?

Se alguma resposta for nao, a tarefa ainda e estabilizacao, nao feature.
