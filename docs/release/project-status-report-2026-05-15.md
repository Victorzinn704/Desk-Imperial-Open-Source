# Relatorio De Estado Do Projeto — 2026-05-15

Este relatorio registra o estado atual do Desk Imperial apos a frente de integracoes, PWA mobile, Mercado Pago Point, impressao termica, Telegram, imagens por EAN e refatoracoes de code health.

Ele nao substitui os runbooks canonicos. O objetivo e dar uma visao executiva e tecnica para retomada segura do trabalho.

## Resumo Executivo

O projeto esta em uma fase de produto real: backend, frontend, PWA, realtime, pagamento, impressao e notificacoes ja existem como fluxo integrado. O principal risco deixou de ser "falta de feature" e passou a ser disciplina operacional: nao abrir novas frentes sem medir impacto, validar CI e documentar drift.

Estado atual:

- **Produto**: Desk Imperial opera como SaaS de gestao comercial para PDV, comandas, salao, cozinha, financeiro e mobile.
- **Backend**: NestJS, Prisma, PostgreSQL, Redis, Socket.IO, filas/workers e integracoes externas.
- **Frontend**: Next.js, PWA owner/staff, dashboard web, PDV, design lab e fluxos mobile.
- **Integracoes**: Mercado Pago Point, Telegram, QZ Tray, lookup de produtos por EAN, observabilidade e deploy Oracle.
- **Qualidade**: ha padrao interno de Code Health, mas ainda existem hotspots historicos e warnings que devem ser tratados por fatias planejadas.

## Linha Do Tempo Recente

### 2026-05-01 a 2026-05-03

Frente de reconstrucao e saude de codigo:

- reducao de complexidade em services e componentes criticos;
- consolidacao de padroes de `facade`, `controller`, `model`, `content`, `view` e `helpers`;
- criacao do guia interno baseado em CodeScene;
- estabilizacao de realtime com buffer/dedup e guardrails de Redis em producao;
- reducao de warnings e hotspots em areas como auth, operations, products, orders, mailer, login e PDV.

### 2026-05-04 a 2026-05-08

Frente de integracoes operacionais:

- Mercado Pago Point integrado ao fluxo de comanda;
- envio para maquininha separado do fechamento manual;
- webhook como origem confiavel para confirmacao financeira;
- fila/worker para reduzir latencia percebida;
- impressao termica com QZ Tray e diagnostico de material assinado;
- Telegram com comandos, cards e caminho para intencao via Gemini;
- lookup de imagens reais por EAN;
- PWA owner/staff com ajustes de realtime, fallback REST e UX mobile.

### 2026-05-15

Retomada da entrega:

- worktree ainda contem alteracoes nao commitadas da frente mobile/PWA e alteracoes preservadas anteriores;
- validacao local focada da frente web/mobile passou anteriormente com typecheck, lint sem erros e testes focados;
- este relatorio e o novo workflow documentam como seguir sem perder controle.

## Entregas Tecnicas Ja Criadas

### PWA Owner/Staff

O PWA evoluiu para operar como app mobile, nao apenas uma pagina responsiva:

- rota `/app` com moldura propria;
- scroll interno controlado;
- protecao contra pull-to-refresh concorrendo com botoes, inputs e modais;
- fallback REST quando realtime falha ou volta de background;
- owner/staff com atualizacao mais agressiva para salao/cozinha.

Arquivos relevantes:

- `apps/web/app/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/shared/use-pull-to-refresh.ts`
- `apps/web/components/owner-mobile/*`
- `apps/web/components/staff-mobile/*`

### Camera E Codigo De Barras

O scanner mobile foi separado em facade, engine e view:

- tenta `BarcodeDetector` nativo;
- cai para ZXing quando o navegador nao suporta leitura nativa;
- tenta multiplas constraints de camera traseira antes de falhar;
- mostra erro explicito quando permissao/HTTPS/browser impedem uso.

Arquivos relevantes:

- `apps/web/components/owner-mobile/owner-barcode-scanner-sheet.tsx`
- `apps/web/components/owner-mobile/owner-barcode-scanner.engine.ts`
- `apps/web/components/owner-mobile/owner-barcode-scanner-sheet.view.tsx`

### Mercado Pago Point

O fluxo correto e:

```text
PWA/PDV -> cria intent local -> worker envia para Point -> webhook confirma -> backend fecha/atualiza comanda -> realtime propaga
```

Melhorias ja feitas:

- botao "Enviar para maquininha" preserva fluxo manual;
- owner mobile envia `replacePending: true` para permitir trocar metodo/reemitir intent pendente;
- PIX nao foi removido para validar comportamento real versus documentacao;
- integracao foi documentada em `docs/operations/mercado-pago-point.md`.

Ponto de atencao:

- confirmacao financeira nunca deve depender de callback do browser/PWA. O backend deve confiar no webhook/consulta autenticada do provedor.

### Impressao Termica

O desenho correto continua local:

```text
Backend registra evento/job -> PWA/web solicita impressao -> ponte local fala com a impressora
```

Pontes aceitas:

- QZ Tray em PC da LAN;
- Web Serial/Web USB quando o browser e hardware suportam;
- Web Bluetooth somente para BLE;
- print agent local empacotado quando QZ/Web APIs nao forem suficientes.

Limite real:

- uma impressora Bluetooth Classic/SPP nao aparece no seletor Web Bluetooth do Android. Isso nao e corrigivel via frontend web.

### Telegram

O Telegram ja tem base para:

- comandos operacionais;
- cards/menus;
- workers para nao bloquear webhook;
- rota opcional de intencao via Gemini.

Risco atual:

- tornar o bot "inteligente" demais sem fronteira pode vazar regra de negocio ou deixar comandos sensiveis ambiguos. A IA deve rotear intencao para comandos permitidos, nao executar acao livre.

### Imagens Por EAN

Cadeia planejada:

```text
EANPictures / API nacional -> OpenFoodFacts -> placeholder explicito sem foto
```

Regra:

- nao usar imagem fake generica para produto embalado quando existir EAN;
- cachear resultado por EAN para evitar latencia e dependencia externa a cada cadastro.

## Estado Atual Do Worktree

Arquivos modificados no momento da retomada:

- `apps/api/src/modules/geocoding/geocoding-mappers.util.ts`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/owner-mobile/*`
- `apps/web/components/shared/thermal-print-settings-card.model.ts`
- `apps/web/components/shared/use-pull-to-refresh.ts`
- `apps/web/components/staff-mobile/*`
- `apps/web/next.config.ts`

Arquivos novos ainda nao versionados:

- `apps/web/components/owner-mobile/owner-barcode-scanner.engine.ts`
- `apps/web/components/owner-mobile/owner-barcode-scanner-sheet.view.tsx`
- `apps/web/components/owner-mobile/use-owner-mobile-shell-queries.test.ts`
- `apps/web/components/owner-mobile/use-owner-mobile-shell-url-sync.ts`

Observacao:

- algumas alteracoes de `geocoding` e queries mobile ja estavam sujas antes da ultima retomada e devem ser revisadas antes de commit/deploy;
- nao usar `SourceMode working-tree` em producao para mascarar arquivo untracked.

## Validacoes Locais Recentes

Validacoes executadas na ultima passada da frente web/mobile:

```powershell
npm --workspace @partner/web run typecheck
npm --workspace @partner/web run lint -- --quiet
npm --workspace @partner/web run test -- components/owner-mobile/owner-mobile-shell.test.tsx components/owner-mobile/use-owner-mobile-shell-mutations.test.tsx components/owner-mobile/owner-quick-register-view.test.tsx components/staff-mobile/staff-mobile-shell.test.tsx components/staff-mobile/mobile-order-builder.test.tsx --reporter=dot
```

Resultado registrado:

- typecheck web: passou;
- lint web sem erros: passou;
- testes focados mobile: 38 testes passaram.

Antes de commit/deploy ainda e necessario repetir os checks apos qualquer nova documentacao ou ajuste.

## Riscos Abertos

### Alto

- **Worktree sujo**: precisa separar alteracao antiga de entrega atual antes de commit.
- **CI/GitHub**: nao assumir verde sem consultar checks reais depois do push.
- **PWA Android**: precisa teste fisico para camera, touch, foreground/background e fluxo de comanda.
- **Mercado Pago Point**: webhook real precisa ser testado em ambiente publico com URL configurada no painel do Mercado Pago.
- **Impressao termica**: QZ e Bluetooth dependem do ambiente local do cliente; Oracle nao imprime USB/Bluetooth diretamente.

### Medio

- **Imagens por EAN**: provedores externos podem falhar, repetir imagem ou mudar contrato.
- **Telegram**: IA via Gemini deve ficar atras de roteador de comandos e guardrails.
- **Realtime**: performance do PWA depende de Redis, cache e invalidador correto; polling alto nao pode virar muleta.

### Baixo

- **Docs historicas**: algumas continuam uteis, mas nao sao fonte canonica.
- **Warnings antigos**: devem ser tratados em fatias por hotspot, nao no meio de feature critica.

## Proximo Plano Recomendado

1. **Fechar worktree atual**
   - revisar diff;
   - separar alteracoes antigas;
   - rodar typecheck/lint/testes focados;
   - criar commit unico da frente PWA/integracoes.

2. **Validar fluxo operacional real**
   - abrir comanda no PWA;
   - enviar cobranca Point;
   - confirmar webhook;
   - atualizar comanda via realtime;
   - imprimir recibo/comanda;
   - validar cozinha recebendo item de comida imediatamente.

3. **Atacar performance PWA/realtime**
   - medir `mutation -> first_emit`;
   - medir `operations/live` e `operations/kitchen`;
   - validar Redis adapter em prod;
   - reduzir payload/cache misses antes de aumentar polling.

4. **Resolver impressao mobile de forma honesta**
   - decidir entre QZ LAN, Web Serial/USB, Web Bluetooth BLE ou print agent local;
   - documentar matriz de compatibilidade por hardware;
   - nao prometer suporte browser para Bluetooth Classic/SPP.

5. **Consolidar bot Telegram**
   - cards bonitos;
   - resposta rapida;
   - worker para tarefas lentas;
   - Gemini como classificador de intencao, nao executor livre.

## Criterio De Entrega Para A Proxima Release

A proxima release so deve ser considerada pronta quando:

- `git status` estiver explicado e sem arquivo surpresa;
- typecheck API/Web passar;
- lint sem erros passar;
- testes criticos ou focados da frente passarem;
- documentacao de comportamento alterado estiver atualizada;
- deploy Oracle for feito com `-SourceMode head`;
- GitHub Actions estiver verde;
- smoke real do fluxo operacional principal for executado.

## Documentos Relacionados

- `docs/architecture/delivery-operating-workflow.md`
- `docs/architecture/code-health-creation-workflow.md`
- `docs/architecture/code-health-engineering-guide.md`
- `docs/operations/integration-rollout-2026-05-08.md`
- `docs/operations/realtime-performance-runbook.md`
- `docs/operations/mercado-pago-point.md`
- `docs/operations/thermal-printing.md`
- `docs/operations/telegram-bot-rollout.md`
- `docs/operations/product-image-quality-audit.md`
