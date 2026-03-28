# Gaps and Risks - 2026-03-28

## Confirmado como coberto

- auth web de entrada
- navegação pública e protegida principal no web
- regressão crítica de shells `owner` e `staff`
- regressão crítica de `PDV histórico`
- operações e auth da API por suíte unitária
- smoke HTTP da API

## Lacunas reais

### Alta prioridade

- integração real com Postgres em teste automatizado
- integração real com Redis em teste automatizado
- smoke real do socket/realtime com autenticação
- smoke de fluxo completo `PDV -> comanda -> cozinha -> atualização ao vivo`

### Média prioridade

- fluxos web de recuperação de senha e verificação de e-mail
- logout e persistência de sessão ponta a ponta no web
- testes E2E autenticados de owner/staff usando usuário seedado real

### Baixa prioridade

- multi-browser E2E além de Chromium
- visual regression dedicada
- performance budget automatizado em CI

## Risco residual aceito nesta baseline

1. O smoke E2E backend ainda usa infraestrutura mockada.
2. Os testes de carga foram versionados, mas não executados nesta rodada.
3. O gate web E2E está focado em Chromium para priorizar estabilidade.
4. A saúde real de banco e Redis ainda depende de ambiente dedicado.

## Recomendação de release

### Go com ressalvas

Aceitável para release técnica controlada se:

- staging estiver funcional
- secrets e deploy estiverem saneados
- smoke manual final cobrir:
  - login owner
  - login staff
  - abrir comanda
  - adicionar item
  - cozinha refletir item
  - fechar comanda
  - KPI executivo refletir atualização

### Não tratar como concluído

Não afirmar que o projeto possui hoje:

- stress test executado em ambiente produtivo
- cobertura real de Redis/Postgres em integração viva
- validação multi-browser estável
