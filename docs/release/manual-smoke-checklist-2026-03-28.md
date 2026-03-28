# Manual Smoke Checklist - 2026-03-28

## Auth

- login owner com credencial válida
- login staff com credencial válida
- logout owner
- logout staff

## Operação

- abrir caixa
- abrir comanda
- adicionar item simples
- adicionar item de cozinha
- validar item na cozinha
- fechar comanda

## Gestão

- owner web mostra KPIs executivos
- owner mobile mostra KPIs executivos
- staff mobile mostra somente KPIs próprios
- histórico do PDV web reflete aberta/fechada em tempo real

## Segurança e sessão

- rota protegida sem sessão volta para login
- CSRF continua íntegro no fluxo autenticado
- cookies de sessão válidos no ambiente publicado

## Observabilidade

- endpoint `/api/health` responde
- logs incluem `requestId`
- erros HTTP devolvem `requestId`
