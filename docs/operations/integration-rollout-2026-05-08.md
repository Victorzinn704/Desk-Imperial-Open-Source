# Rollout De Integracoes — 2026-05-08

Este documento consolida a frente de integracoes criada em maio de 2026 para PDV, PWA, maquininha Mercado Pago Point, impressao termica, Telegram e imagens por EAN.

## Objetivo

Reduzir latencia percebida no uso operacional e remover dependencias frageis do fluxo quente:

- o PWA deve responder rapido ao enviar cobranca para maquininha;
- o pagamento confirmado deve atualizar a comanda via backend/realtime;
- a impressao termica deve continuar local, mas com diagnostico claro;
- o cadastro rapido por codigo de barras deve preferir imagem real;
- o Telegram deve responder webhook rapido e deixar trabalho pesado fora da requisicao.

## O Que Foi Feito

### Mercado Pago Point

Foi criado um fluxo de Payment Intent assíncrono:

```text
PDV/PWA -> API cria intent local -> Redis queue -> worker cria order Point -> webhook confirma pagamento
```

Arquivos principais:

- `apps/api/src/modules/operations/comanda-terminal-payment.service.ts`
- `apps/api/src/modules/operations/comanda-terminal-payment-provider.service.ts`
- `apps/api/src/modules/operations/mercado-pago-terminal-order-runtime.service.ts`
- `apps/api/src/modules/operations/mercado-pago-terminal-order-worker.service.ts`

Melhoria pratica:

- a requisicao do PWA nao precisa esperar a chamada externa do Mercado Pago quando Redis esta ativo;
- retry e degradacao ficam centralizados no worker;
- o fechamento financeiro continua seguro, pois depende de webhook/consulta autenticada.

### Impressao Termica e QZ Tray

Foi criado diagnostico de material assinado do QZ:

```text
GET /api/printing/qz/health
```

Ele valida:

- certificado publico carregado;
- private key descriptografavel;
- assinatura RSA funcional;
- readiness do modo assinado.

Se o endpoint retornar `signedModeReady=true`, mas o QZ ainda pedir aceite toda hora, a causa provavel esta no ambiente local do caixa: trust do QZ Tray, Site Manager, extensao bloqueando websocket local ou origem diferente da configurada.

### PWA Android, Bluetooth e Camera

O scanner de codigo de barras no owner mobile foi corrigido para montar o `video` antes de inicializar o fallback ZXing. Isso evita falhas por `videoRef.current` nulo.

O provedor Bluetooth foi relaxado para descoberta ampla com `acceptAllDevices` e `optionalServices`. Isso aumenta a chance de encontrar impressoras BLE, mas nao transforma Bluetooth Classic/SPP em Web Bluetooth.

Decisao tecnica:

- impressora local sempre precisa de ponte local: QZ Tray, Web Serial, Web USB, Web Bluetooth ou print agent;
- Oracle pode registrar e auditar jobs, mas nao imprime sozinho em USB/Bluetooth do cliente.

### Imagens Por EAN

Foi criada a cadeia de provedores:

```text
EANPictures -> OpenFoodFacts -> placeholder explicito sem foto
```

Arquivos principais:

- `apps/web/lib/barcode-lookup.server.ts`
- `apps/web/lib/barcode-lookup.types.ts`
- `apps/web/app/api/barcode/lookup/route.ts`
- `apps/web/app/api/barcode/image/eanpictures/[barcode]/route.ts`

Melhoria pratica:

- bebidas e produtos embalados deixam de depender de imagem fake;
- imagem nacional por EAN entra como prioridade;
- o front aceita a rota interna `/api/barcode/image/...` como fonte confiavel.

### Telegram

Foi adicionada uma rota opcional de intencao via Gemini para texto livre, sem remover os comandos/callbacks existentes.

Fluxo correto:

```text
Telegram webhook -> validacao de segredo -> fila inbound Redis -> worker -> comandos/cards
```

O Gemini e fallback opcional e controlado por variavel de ambiente. Ele retorna somente comandos permitidos; nao vira uma conversa livre com dados sensiveis.

## O Que Melhorou

- Menos latencia no caminho de envio para maquininha quando Redis esta ativo.
- Melhor resiliencia quando Mercado Pago oscila.
- Diagnostico objetivo para QZ Tray, reduzindo tentativa e erro.
- Camera do PWA deixa de falhar por inicializacao prematura do video.
- Lookup de imagens passa a priorizar fonte real por EAN.
- Telegram fica preparado para texto livre sem bloquear webhook.
- `barcode-lookup.server.ts` foi refatorado para reduzir Primitive Obsession e String Heavy Function Arguments via objetos de parametro e tipos de dominio.

## O Que Foi Criado E Precisava De Documentacao

Antes desta atualizacao, ainda faltava documentar:

- fila assíncrona de order Point;
- endpoint de health do QZ Tray;
- limitacao real de Web Bluetooth no Android;
- proxy server-side da EANPictures;
- Gemini intent route no Telegram.

Esses pontos agora estao cobertos neste documento e nos runbooks especificos:

- `docs/operations/mercado-pago-point.md`
- `docs/operations/thermal-printing.md`
- `docs/operations/product-image-quality-audit.md`
- `docs/operations/telegram-bot-rollout.md`

## Documentacao Existente Atualizada Por Drift

### `mercado-pago-point.md`

Estava descrevendo somente criacao inline da order. Foi atualizado para explicar fila Redis, worker e fallback.

### `thermal-printing.md`

Estava correto sobre QZ como integracao local, mas nao documentava o endpoint de health nem a limitacao pratica do Android/Bluetooth.

### `product-image-quality-audit.md`

Falava de OpenFoodFacts/Pexels/fallback, mas nao da nova cadeia EANPictures -> OpenFoodFacts.

### `telegram-bot-rollout.md`

Descrevia comandos e cards, mas nao documentava inbound worker e Gemini intent route.

## Passo A Passo De Validacao

### 1. Validar API e Redis

```powershell
npm --workspace @partner/api run typecheck
npm --workspace @partner/api run lint
```

No Oracle, confirme que `REDIS_URL` existe no ambiente da API.

### 2. Validar Web/PWA

```powershell
npm --workspace @partner/web run typecheck
npm --workspace @partner/web run lint
```

No Android:

1. abrir o PWA em HTTPS;
2. permitir camera;
3. testar leitura de EAN real;
4. validar se o cadastro rapido preenche nome/marca/imagem quando provedor retorna dados.

### 3. Validar Mercado Pago Point

1. confirmar maquininha em modo PDV;
2. enviar cobranca pequena pelo botao "Enviar para maquininha";
3. confirmar que a intent nasce `PENDING`;
4. aguardar worker gravar `providerOrderId`;
5. pagar na Point;
6. validar webhook, pagamento local e realtime.

### 4. Validar QZ Tray

Com usuario autenticado:

```text
GET /api/printing/qz/health
```

Esperado: `signedModeReady=true`.

Depois:

1. abrir QZ Tray;
2. liberar a origem do app no navegador;
3. imprimir teste;
4. fechar comanda de teste e validar cupom operacional.

### 5. Validar Telegram

```bash
npm run telegram:webhook:info
```

No chat privado:

1. `/start`;
2. `/menu`;
3. texto livre como `quero ver vendas`;
4. validar resposta com cards;
5. verificar health do webhook.

## Regras De Nao Regressao

- nao colocar chamada externa longa no caminho sincrono do PWA;
- nao aceitar confirmacao financeira enviada pelo browser;
- nao usar Pexels para produto embalado com EAN;
- nao expor private key QZ no frontend;
- nao deixar webhook Telegram executar Gemini diretamente antes de responder ao provedor;
- nao criar arquivo novo acima de 300 linhas sem justificativa;
- usar objetos de parametro quando a funcao carrega semantica de dominio, principalmente EAN, request URL, filtros e payloads.

## Proximas Melhorias Planejadas

1. Persistir cache de lookup por EAN em Redis ou banco, nao apenas memoria de processo.
2. Criar painel de reimpressao por pagamento confirmado.
3. Expor metrica de latencia `payment_intent_created -> provider_order_created`.
4. Criar smoke remoto para QZ health e Mercado Pago intent sem pagamento real.
5. Investigar print agent local empacotado para estabelecimentos que nao conseguem usar QZ.
