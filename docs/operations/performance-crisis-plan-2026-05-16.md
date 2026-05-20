# Plano Critico de Performance - Operacoes, PWA e Realtime

Data: 2026-05-16

## Objetivo

Transformar performance em uma frente medida, repetivel e priorizada. O foco e reduzir atraso percebido em salao, mesas, PWA, cozinha, Mercado Pago e Telegram sem deteriorar a saude do codigo.

## Regra de execucao

Nenhuma otimizacao entra por opiniao. Toda rodada precisa ter:

1. baseline antes;
2. mudanca pequena;
3. validacao depois;
4. leitura de risco;
5. registro no runbook quando virar regra operacional.

## Cronograma recomendado

### Fase 0 - Baseline operacional

Prazo: imediato.

Status em 2026-05-17: concluido localmente com API e web controladas.

Entregas:

- rodar `npm run smoke:operations:performance -- --report .cache/performance/operations-baseline.md`;
- registrar p50/p95/p99 e payload p95 de `health`, `operations/live`, `operations/kitchen` e `operations/summary`;
- confirmar no Grafana as metricas `desk.operations.*` e `desk.operations.realtime.*`;
- separar gargalo de REST, Redis/cache, Socket.IO, PWA paint e rede.

Saida esperada:

- um relatorio local por rodada;
- lista curta de endpoints acima do alvo;
- decisao objetiva do primeiro ponto a corrigir.

Resultado local:

- REST estrito dentro do alvo em todos os endpoints (`operations/live`, `operations/kitchen`, `operations/summary`);
- smoke PWA/realtime passou com comanda aberta, item de cozinha enfileirado, status de cozinha atualizado e comanda fechada;
- nenhum refresh manual foi exigido no fluxo medido;
- primeiro gargalo real a investigar agora e diferenca entre ambiente local controlado e PWA Android real: rede, service worker, foreground/resume, cache do navegador e dispositivo.

### Fase 1 - Caminho quente de comanda

Prazo: primeira rodada de otimizacao.

Escopo:

- abrir comanda;
- adicionar item;
- item de comida nascer na cozinha;
- fechar comanda;
- atualizar salao/PWA sem refresh manual.

Medidas obrigatorias:

- duracao da mutacao;
- `mutation_to_first_emit`;
- tempo de entrega do envelope no cliente;
- tempo ate patch/paint;
- invalidador REST como fallback, sem polling agressivo.

Meta:

- feedback local no PWA em menos de `100ms`;
- primeiro evento realtime visivel em ate `300ms` apos commit;
- fallback REST sem exigir atualizar pagina manualmente.

### Fase 2 - Redis como acelerador, nao muleta

Prazo: apos baseline do caminho quente.

Uso correto:

- cache curto para snapshots de leitura;
- rate limit e estado efemero com TTL;
- pub/sub e adapter Socket.IO;
- locks/idempotencia curta quando houver risco de duplicar evento.

Uso proibido:

- dado transacional que precisa de consistencia forte;
- chave sem TTL;
- cache para esconder query errada;
- invalidar tudo em qualquer evento.

### Fase 3 - PWA Android e UX percebida

Prazo: apos corrigir entrega de eventos.

Escopo:

- toque e gestos sem atraso;
- layout com safe area e viewport correto;
- camera e barcode scanner sem bloqueio silencioso;
- estado otimista consistente;
- tela de salao/comanda sem dependencia de refresh manual.

Medidas:

- tempo entre toque e resposta visual;
- quantidade de renders em fluxo de comanda;
- tamanho de bundle da superficie PWA;
- eventos descartados ou fora de ordem.

### Fase 4 - Webhooks externos

Prazo: depois da malha interna estar estavel.

Escopo:

- Mercado Pago Point;
- Telegram inbound/outbound;
- fila de impressao pos-pagamento.

Meta:

- webhook responder rapido e jogar trabalho pesado para worker/fila;
- idempotencia por evento externo;
- status da comanda e impressao nao dependerem do usuario ficar na tela.

### Fase 5 - Decisao Go para linha quente

Go entra somente se as fases anteriores provarem saturacao do Node no transporte realtime.

Sinais que justificam:

- event loop lag alto durante fan-out;
- `publish.duration` alto com Redis e payload corretos;
- muitas conexoes simultaneas exigindo gateway dedicado;
- fronteira de dominio pequena e estavel.

Sinais que nao justificam:

- query lenta;
- payload grande;
- cache ruim;
- PWA renderizando demais;
- webhook fazendo trabalho pesado inline.

## Ordem de ataque quando algo estiver lento

1. Confirmar se o problema e reproducivel com smoke ou telemetria.
2. Verificar `health`; se estiver lento, investigar infra antes do dominio.
3. Verificar payload p95; se estiver alto, reduzir shape.
4. Verificar cache hit/miss e invalidacao.
5. Verificar query e indice.
6. Verificar `mutation_to_first_emit`.
7. Verificar entrega Socket.IO e rooms.
8. Verificar patch/paint no PWA.
9. So depois considerar arquitetura nova.

## Gates de saude do codigo

- funcoes novas abaixo de 70 linhas sempre que possivel;
- complexidade ciclomática preferencial abaixo de 9;
- sem bumpy road em fluxo quente;
- parametros agrupados por objeto quando passar de 4 argumentos;
- scripts divididos em executor, modelagem e relatorio;
- docs atualizadas quando o fluxo operacional mudar.

## Resultado esperado

O projeto deve operar com salao, cozinha e PWA sincronizados de forma imperceptivel para o usuario. O objetivo nao e apenas baixar numeros: e remover refresh manual, atraso de comando e perda de evento em uso real.
