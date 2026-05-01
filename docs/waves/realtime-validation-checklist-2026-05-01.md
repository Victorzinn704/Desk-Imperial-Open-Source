# Realtime Validation Checklist — 2026-05-01

## Objetivo

Checklist mínimo para validar cada wave sem depender de memória ou “pareceu funcionar”.

## Smoke funcional base

- [ ] login owner
- [ ] login staff
- [ ] abrir comanda
- [ ] adicionar item
- [ ] item aparece na cozinha
- [ ] `QUEUED -> IN_PREPARATION -> READY`
- [ ] fechar comanda
- [ ] caixa reflete atualização

## Segurança e sessão

- [ ] logout owner com socket aberto
- [ ] logout staff com socket aberto
- [x] revogar sessão no servidor e confirmar disconnect do socket em teste focado
- [x] token inválido não fica consultando o banco indefinidamente no path de auth
- [x] churn de conexão realtime tem rate limit básico no handshake sem derrubar o socket quando o cache está indisponível

## Mobile e rede ruim

- [ ] foreground normal
- [x] background -> foreground coberto com refresh explícito via `visibilitychange`
- [ ] `wifi -> 4G`
- [ ] `4G -> wifi`
- [ ] tela bloqueada/desbloqueada
- [x] aba escondida/visível com request de baseline controlado

## Consistência

- [ ] comanda otimista converge para comanda real
- [ ] item otimista converge para item real
- [ ] evento atrasado não regrede status
- [ ] reconnect com gap volta ao baseline correto

## Ruído e performance

- [x] número de sockets ativos por superfície foi instrumentado
- [x] número de listeners ativos por superfície foi instrumentado
- [x] `mutation -> first_emit` foi medido
- [x] `event -> patch -> paint` foi medido
- [x] `fanout_count` por evento foi parcialmente coberto por `dispatch_targets + socket_room_size`
- [x] payloads críticos tiveram tamanho medido
- [x] `closeComanda_duration` foi medido
- [x] `recalculateCashSession_duration` foi medido
- [x] `auditLog_duration` foi medido
- [x] `cache_hit` / `cache_miss` no lookup de sessão foram medidos
- [x] `negative_cache_hit` foi instrumentado com cache negativo real
- [x] `events_out_of_order` foi instrumentado com heurística explícita
- [x] `events_dropped` foi instrumentado como descarte local com razão explícita
- [x] queries mobile cobertas pelo refresh central não refetcham de novo no reconnect

## Autorização

- [ ] STAFF não recebe payload financeiro owner-level
- [ ] OWNER continua recebendo os eventos necessários
- [ ] Telegram continua funcionando para o workspace correto

## Gate para remoção

Antes de remover qualquer room, evento, fallback ou helper:

- [ ] há prova de uso ou desuso
- [ ] todos os consumers foram mapeados
- [ ] há smoke específico cobrindo o comportamento
- [ ] há rollback claro
