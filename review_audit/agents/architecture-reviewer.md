# Auditoria Arquitetural - architecture-reviewer

## Resumo do dominio
O dominio central e um sistema de gestao comercial para pequenos e medios comerciantes brasileiros. A macroarquitetura esta organizada em `apps/api`, `apps/web`, `packages/types` e `infra`, o que e um bom sinal de alinhamento entre backend, frontend e operacao. O core de negocio e operacional (comandas, caixa, mesas, PDV), com contextos de suporte para auth, consentimento/LGPD, produtos, pedidos, financeiro, equipe, geocoding, mailer, realtime e observabilidade.

## Leitura executiva
O repositório tem uma forma arquitetural razoavel e nao parece "sem dono": ha fronteiras de alto nivel, nomes de dominio claros e um pacote compartilhado de contratos entre API e frontend. O risco principal nao e ausencia de modularidade, e sim excesso de acoplamento em poucos pontos de orquestracao. Em especial, auth/consent/geocoding formam um ciclo, operations/produtos/financeiro compartilham invalidacao e pub/sub, e o frontend concentra muita logica de composicao em shells e hooks grandes.

## Principais riscos
- Ciclo explicito entre contextos de identidade, consentimento e geocoding, com dependencia bidirecional via `forwardRef`.
- Contexto operacional acoplado ao financeiro e ao realtime por invalidacao direta de cache e publicacao de eventos.
- Servicos e helpers "god" em backend e frontend, o que reduz coesao e torna refatoracoes mais caras.
- Pacote compartilhado de contratos amplo o suficiente para virar um gargalo de versionamento se continuar crescendo sem subcontextos.

## Achados detalhados

### 1) Identidade, consentimento e geocoding estao entrelacados em um ciclo
- Tipo: Fato confirmado.
- Severidade: Alta.
- Impacto: A evolucao de auth, onboarding, consentimento e geocoding nao pode ocorrer de forma independente; a ordem de bootstrap e a manutencao de testes ficam mais sensiveis, e a extracao futura desses contextos fica mais cara.
- Confianca: Alta.
- Evidencias:
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.module.ts:14` importa `ConsentModule` e `GeocodingModule` via `forwardRef`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/consent/consent.module.ts:9` importa `AuthModule` via `forwardRef`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/geocoding/geocoding.module.ts:8` importa `AuthModule` via `forwardRef`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:111` a classe principal recebe muitas dependencias de outros contextos.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:142` o mesmo servico concentra cadastro.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:297` o mesmo servico concentra login.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:426` o mesmo servico concentra login demo.
  - Medicao local: `auth.service.ts` e um arquivo muito extenso, com mais de 2 mil linhas.
- Analise:
  - Fato confirmado: existe dependencia circular entre auth, consent e geocoding.
  - Inferencia forte: auth virou um ponto de convergencia para onboarding, sessao, verificacao, redirecionamento e integracoes, em vez de um limite claro de contexto.
  - Hipotese: se novas regras de privacidade ou geolocalizacao entrarem, esse ciclo tende a se expandir e virar dependencia de inicializacao ainda mais fragil.
- Recomendacoes concretas:
  - Extrair um fluxo de onboarding/registro separado do fluxo de sessao.
  - Quebrar o ciclo por meio de eventos de aplicacao ou servicos intermediarios, evitando `forwardRef` entre contextos principais.
  - Dividir `AuthService` em partes menores: registro, sessao, recuperacao, verificacao e politicas de seguranca.

### 2) Operations, products e finance funcionam como um mesmo corredor de invalidacao
- Tipo: Fato confirmado.
- Severidade: Alta.
- Impacto: Alteracoes em operacoes ou produtos podem disparar efeitos em financeiro e realtime, aumentando o blast radius de qualquer mudanca funcional. Isso dificulta evolucao independente dos contextos e torna regressao mais provavel.
- Confianca: Alta.
- Evidencias:
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/operations.module.ts:15` importa `OperationsRealtimeModule` e `FinanceModule` junto com o core operacional.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.module.ts:9` importa `FinanceModule`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.module.ts:10` importa `FinanceModule` e `AdminPinModule`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:25` injeta `FinanceService`.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:55` a dependencia financeira e opcional, o que indica acoplamento de compatibilidade.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:58` o servico operacional atualiza o resumo financeiro diretamente.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/comanda.service.ts:1089` a comanda fechada invalida orders e finance em linha.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.service.ts:21` produtos conhece finance.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.service.ts:56` a dependencia financeira tambem e opcional.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.service.ts:124` produtos atualiza o resumo financeiro por conta propria.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/products/products.service.ts:235` criacao de produto dispara refresh financeiro.
  - Medicao local: `operations-helpers.service.ts` e `comanda.service.ts` sao arquivos muito extensos e concentram varias responsabilidades.
- Analise:
  - Fato confirmado: `operations` nao e apenas orquestracao local; ele tambem administra efeitos colaterais em finance, cache e realtime.
  - Inferencia forte: o bounded context operacional esta cumprindo o papel de "hub", mas isso reduz coesao porque negocio, cache e integracao estao misturados no mesmo fluxo.
  - Risco potencial: conforme o numero de telas e KPIs crescer, essa invalidacao cruzada pode gerar inconsistencias sutis entre snapshot ao vivo, resumo financeiro e pedidos.
- Recomendacoes concretas:
  - Movimentar invalidacao de cache e warming para handlers de evento ou aplicacao, nao para servicos de dominio.
  - Definir um contrato explicito entre operations e finance, preferencialmente por eventos ou uma facade de leitura.
  - Reduzir dependencias opcionais entre `ProductsService`, `ComandaService` e `FinanceService`.
  - Separar `OperationsHelpersService` em subservicos por responsabilidade: snapshot, regras de caixa, regras de comanda e validacao de jornada.

### 3) O frontend e coerente, mas a composicao ficou centralizada demais
- Tipo: Fato confirmado com inferencia forte.
- Severidade: Media.
- Impacto: A evolucao de rotas, telas e states do dashboard depende de um shell muito grande, o que aumenta custo de manutencao e dificulta testar fronteiras entre UX, dados e realtime.
- Confianca: Media-Alta.
- Evidencias:
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx:386` o dashboard principal e um unico componente de composicao.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx:399` o shell tambem faz fetch da sessao.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx:420` o shell coordena varias queries de dominios diferentes.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx:439` o shell ativa realtime operacional.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx:590` o shell decide qual ambiente de negocio renderizar.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/hooks/useDashboardQueries.ts:34` as queries do dashboard sao orquestradas em um unico hook.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/operations/use-operations-realtime.ts:31` o hook de realtime operacional centraliza invalidações e patches.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/operations/use-operations-realtime.ts:152` o mesmo arquivo aplica envelopes de realtime.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/components/operations/use-operations-realtime.ts:237` o arquivo tambem reescreve o snapshot ao vivo.
  - Medicao local: `dashboard-shell.tsx` e `use-operations-realtime.ts` sao arquivos muito extensos e concentram orquestracao critica.
- Analise:
  - Fato confirmado: o frontend usa route shells e hooks dedicados, entao nao ha uma bagunca total.
  - Inferencia forte: o dashboard shell e o realtime hook funcionam como composicao raiz e motor de reconciliacao, o que e eficiente hoje, mas concentra o risco em poucos arquivos.
  - Hipotese: se novos dominios forem adicionados ao painel, esses dois pontos podem virar gargalos de escalabilidade arquitetural e de produtividade.
- Recomendacoes concretas:
  - Quebrar o shell por rotas/ambientes menores e manter cada ambiente como entrypoint de composicao.
  - Extrair a logica de patching de realtime para helpers por subdominio ou reducers menores.
  - Manter `useDashboardScopedQueries` como camada de orquestracao, mas evitar que o shell cresca com mais regras de negocio.

### 4) O pacote compartilhado de contratos e amplo o suficiente para virar um ponto de estrangulamento
- Tipo: Risco potencial com base em fato confirmado.
- Severidade: Media-baixa hoje, mas crescente se a superficie continuar aumentando.
- Impacto: Mudancas de schema ou response em um contexto podem reverberar imediatamente no backend e no frontend, aumentando o custo de versao e de rollback.
- Confianca: Media.
- Evidencias:
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/tsconfig.json:17` e `C:/Users/Desktop/Documents/desk-imperial/apps/web/tsconfig.json:21` apontam `@contracts/contracts` para `../../packages/types/src/index`.
  - `C:/Users/Desktop/Documents/desk-imperial/packages/types/package.json:2` o pacote existe como `@partner/types`.
  - `C:/Users/Desktop/Documents/desk-imperial/packages/types/package.json:5` e `C:/Users/Desktop/Documents/desk-imperial/packages/types/package.json:6` o entrypoint do pacote aponta para `src/index.ts`.
  - `C:/Users/Desktop/Documents/desk-imperial/packages/types/src/contracts.ts:1` o arquivo agrega contratos de varias areas.
  - Medicao local: `contracts.ts` e um arquivo extenso de contratos compartilhados.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/operations/operations.types.ts:3` a API converte modelos Prisma para o contrato compartilhado.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/lib/api-operations.ts:1` o frontend consome os mesmos contratos em chamadas de API.
  - `C:/Users/Desktop/Documents/desk-imperial/apps/web/lib/api-products.ts:1` o frontend repete esse padrao para produtos.
- Analise:
  - Fato confirmado: a estrategia de contratos compartilhados existe e esta sendo usada nas duas apps.
  - Inferencia forte: isso melhora alinhamento API/frontend hoje, mas tambem cria um ponto unico de acoplamento semanticamente largo.
  - Hipotese: se mais DTOs de dominio continuarem entrando nesse mesmo arquivo, o pacote pode virar um monolito de tipos com versionamento dificil.
- Recomendacoes concretas:
  - Organizar `packages/types` por subcontexto quando o volume crescer, em vez de continuar expandindo um unico barrel.
  - Separar contratos de leitura por dominio, especialmente para operations, finance e products.
  - Preservar o pacote como fonte de verdade, mas com fronteiras mais finas e nomes mais explicitos.

## Sintese final
Em termos macro, a arquitetura esta bem melhor do que uma base sem fronteiras: ha separacao clara entre API, web, contratos e infra. O problema e mais fino e mais caro de resolver depois: poucos pontos centrais estao absorvendo responsabilidade demais. Se atacarmos os ciclos de auth/consent/geocoding, a invalidacao cruzada operations/products/finance e a centralizacao do dashboard/realtime, a base ganha muito em coesao e escalabilidade sem precisar de uma grande reescrita.
