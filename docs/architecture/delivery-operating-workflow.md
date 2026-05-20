# Workflow Operacional De Entrega — Desk Imperial

Este workflow define como trabalhamos daqui para frente. Ele existe para evitar regressao, alucinacao tecnica, worktree sujo sem explicacao, CI vermelho e feature nova em cima de base instavel.

Base conceitual:

- `docs/architecture/code-health-engineering-guide.md`
- `docs/architecture/code-health-creation-workflow.md`
- `docs/architecture/code-health-refactoring-standard.md`
- `docs/architecture/sldd-working-agreement.md`
- `docs/operations/realtime-performance-runbook.md`

## Regra Principal

Toda entrega precisa ser pequena o suficiente para validar e grande o suficiente para resolver um problema real.

Nao existe "pronto" sem:

- problema definido;
- escopo delimitado;
- arquivos lidos;
- contratos preservados;
- validacao executada;
- documentacao atualizada quando comportamento muda;
- estado do Git explicado.

## Fase 0 — Retomada Segura

Use sempre que uma sessao caiu, houve queda de energia, troca de agente ou muitos dias sem trabalhar.

1. Ler `.claude/napkin.md`.
2. Rodar:

```powershell
git status --short
git diff --name-only
git log --oneline -n 12
```

3. Classificar o worktree:

| Tipo                 | Acao                                                        |
| -------------------- | ----------------------------------------------------------- |
| Mudanca nossa atual  | revisar, validar e documentar                               |
| Mudanca antiga limpa | preservar e citar no resumo                                 |
| Mudanca antiga suja  | nao reverter; isolar como risco e pedir decisao se bloquear |
| Arquivo untracked    | explicar origem antes de deploy                             |
| Gerado por build     | normalizar ou remover somente se for seguro e relacionado   |

4. Nao iniciar feature nova enquanto o estado atual nao estiver explicado.

## Fase 1 — Intencao De Produto

Antes de codigo, escrever em uma frase:

```text
Estamos resolvendo [problema] para [usuario] no fluxo [contexto], mantendo [contratos].
```

Exemplos:

- "Estamos reduzindo o delay do PWA do garcom ao abrir comanda, mantendo cozinha, salao e owner sincronizados."
- "Estamos permitindo reenviar cobranca Point sem criar outra comanda, mantendo webhook como confirmacao financeira."

Se a frase nao cabe, o escopo esta grande demais.

## Fase 2 — Mapa De Superficie

Mapear antes de editar:

- usuario afetado: owner, staff, cozinha, caixa, cliente final;
- superficie: API, Web, PWA, realtime, pagamento, impressao, Telegram, infra;
- arquivos provaveis;
- rotas e contratos publicos;
- efeitos colaterais: cache, Redis, auditoria, webhook, impressao, notificacao;
- risco: baixo, medio, alto, critico.

Para risco alto/critico, aplicar SLDD:

1. intencao do produto;
2. leitura do codigo existente;
3. desenho de alto nivel;
4. desenho de baixo nivel;
5. testes primeiro quando viavel;
6. implementacao minima;
7. validacao e rollback.

## Fase 3 — Orçamento De Code Health

Antes da edicao, declarar:

```markdown
## Code Health Budget

- Arquivos esperados:
- Arquivos que nao podem piorar:
- Funcoes que podem passar do limite:
- Estrategia de extracao:
- Smells proibidos:
- Testes/gates:
- Excecoes aceitas:
```

Limites padrao:

| Item               | Limite                                               |
| ------------------ | ---------------------------------------------------- |
| Arquivo novo       | ate 300 linhas                                       |
| Arquivo alterado   | alvo 300; maximo temporario 450 com plano            |
| Funcao nova        | ate 50 linhas                                        |
| Componente React   | complexidade menor que 10                            |
| Backend TypeScript | complexidade menor que 9                             |
| Argumentos         | ate 4; acima disso introduzir objeto de parametro    |
| Aninhamento        | ate 2 niveis                                         |
| Teste individual   | ate 70 linhas; acima disso usar fixtures/case tables |

Se um arquivo ja e hotspot, tocar nele exige melhora mensuravel ou extração planejada no mesmo PR.

## Fase 4 — Implementacao Em Fatias

Trabalhar em fatias que possam ser validadas:

1. contrato/tipos;
2. regra pura ou helper;
3. service/hook/controller;
4. UI/view;
5. testes;
6. docs;
7. smoke.

Padroes obrigatorios:

- arquivo publico grande vira facade;
- JSX grande vira `*.view.tsx`, `*.sections.tsx` ou `*.content.ts`;
- regra de negocio vira funcao nomeada;
- condicional composta vira predicado nomeado;
- argumento primitivo repetido vira objeto;
- teste gigante vira tabela de casos;
- side effect recebe nome: `publish*`, `invalidate*`, `enqueue*`, `audit*`, `print*`.

## Fase 5 — Validacao Proporcional Ao Risco

### Docs apenas

```powershell
git diff --check
```

### Web/PWA

```powershell
npm --workspace @partner/web run typecheck
npm --workspace @partner/web run lint -- --quiet
npm --workspace @partner/web run test -- <testes-focados> --reporter=dot
```

### API

```powershell
npm --workspace @partner/api run typecheck
npm --workspace @partner/api run lint -- --quiet
npm --workspace @partner/api run test -- <testes-focados>
```

### Realtime, PDV, comanda, cozinha

Minimo:

```powershell
npm run test:critical
npm --workspace @partner/web run test:critical
npm --workspace @partner/api run test:critical
```

Quando ambiente local/remoto estiver pronto:

```powershell
npm run smoke:operations:performance
```

### Pagamento, caixa, impressao e webhook

Exige:

- teste de contrato;
- teste de erro;
- smoke manual documentado;
- validacao de webhook real quando houver provedor externo;
- nao usar retorno do browser como fonte de verdade financeira.

### Antes de commit de frente mista

```powershell
npm run quality:scope
npm run quality:contracts
npm run typecheck
npm run lint -- --quiet
```

## Fase 6 — Documentacao Obrigatoria

Atualizar docs no mesmo commit quando mudar:

| Mudanca                  | Documento esperado                                             |
| ------------------------ | -------------------------------------------------------------- |
| Realtime/cache/Redis     | `docs/operations/realtime-performance-runbook.md` ou correlato |
| Mercado Pago/Point       | `docs/operations/mercado-pago-point.md`                        |
| Impressao/QZ/print agent | `docs/operations/thermal-printing.md`                          |
| Telegram/Gemini          | `docs/operations/telegram-bot-rollout.md`                      |
| Imagens/EAN              | `docs/operations/product-image-quality-audit.md`               |
| Workflow/qualidade       | `docs/architecture/*`                                          |
| Deploy/Oracle            | `docs/release/*` ou runbook de infra                           |

Documento bom precisa dizer:

- o que mudou;
- como funciona;
- como validar;
- riscos e limites;
- rollback ou fallback;
- arquivos principais.

## Fase 7 — Git, Commit E Deploy

Antes de commit:

1. `git status --short`
2. `git diff --stat`
3. explicar arquivos untracked;
4. rodar gates proporcionais;
5. nao incluir segredo, `.env`, logs, cache ou build artefact.

Commit:

```text
tipo(escopo): verbo no infinitivo + objetivo
```

Exemplos:

- `fix(pwa): estabilizar camera e toque mobile`
- `perf(operations): reduzir latencia de comanda no realtime`
- `docs(workflow): consolidar processo de entrega segura`

Deploy Oracle:

```powershell
infra/scripts/oracle-builder-deploy.ps1 -SourceMode head
```

Nao usar `working-tree` salvo emergencia explicita, porque pode subir arquivo nao versionado e quebrar a proxima release.

Depois do push:

- acompanhar GitHub Actions;
- se falhar, baixar logs e corrigir causa raiz;
- nao abrir nova frente com CI vermelho.

Se o GitHub Actions nao iniciar por billing/spending limit, rode:

```powershell
npm run quality:offline-release -- --profile standard
```

Nesse caso, a entrega fica apenas como "validada localmente, CI remoto bloqueado por billing". Nao use "CI verde" nem "release normal" ate regularizar o GitHub, rerodar os checks no mesmo SHA e obter todos os workflows verdes.

## Fase 8 — Smoke Operacional

Para qualquer release que toque operacao, executar ao menos:

### PWA/Comanda

1. login owner;
2. login staff;
3. abrir comanda no PWA;
4. item de comida aparece na cozinha;
5. salao/owner atualizam sem refresh manual;
6. fechar/pagar comanda;
7. historico recebe modalidade correta.

### Mercado Pago Point

1. maquininha em modo PDV;
2. enviar cobranca;
3. webhook confirma;
4. comanda atualiza;
5. recibo/job de impressao e criado.

### Impressao

1. health QZ;
2. listar impressoras;
3. imprimir teste;
4. imprimir comanda real ou recibo de pagamento.

### Telegram

1. `/start`;
2. `/menu`;
3. comando de vendas;
4. comando de relatorio;
5. mensagem livre roteada para comando permitido.

## Fase 9 — Fechamento

Toda resposta final de entrega deve conter:

- arquivos principais alterados;
- comportamento entregue;
- validacoes executadas;
- riscos que continuam;
- proximo passo recomendado.

Nao dizer "esta tudo pronto" se:

- CI nao foi verificado;
- deploy nao foi feito;
- teste real externo nao foi executado;
- existe worktree sujo nao explicado.

## Workflow De Emergencia

Use quando production/cliente esta bloqueado.

1. congelar novas features;
2. definir sintoma e impacto;
3. reproduzir local ou por log;
4. aplicar menor patch seguro;
5. rodar gate minimo;
6. deploy `head`;
7. smoke;
8. registrar incidente e follow-up.

Mesmo em emergencia, nao:

- desativar auth/CSRF/rate limit;
- confiar em pagamento vindo do browser;
- subir segredo em commit;
- usar force push em branch protegida;
- apagar mudanca do usuario sem autorizacao.

## Checklist Rapido De Proxima Sessao

```text
[ ] Li o napkin
[ ] Rodei git status
[ ] Sei quais mudancas sao minhas
[ ] Tenho frase de intencao
[ ] Declarei orçamento de Code Health
[ ] Li os arquivos antes de alterar
[ ] Rodei gates proporcionais
[ ] Atualizei docs se comportamento mudou
[ ] Expliquei riscos residuais
[ ] Nao deixei CI/deploy como suposicao
```
