# API Troubleshooting

Use este roteiro quando uma integração com a API falhar e o erro ainda não tiver causa clara.

## 1. Dados mínimos

```text
Ambiente:
Endpoint:
Método:
Status code:
x-request-id:
Horário:
Ator: owner | staff | webhook | job | cliente externo
Payload sanitizado:
Resultado esperado:
Resultado obtido:
```

Sem esses dados, a investigação ainda está incompleta.

## 2. Ordem de diagnóstico

1. Confirmar se a API responde em `/api/v1/health`.
2. Confirmar se o contrato atual está em `/api/v1/openapi.json`.
3. Reproduzir o request com `curl`, Postman ou Insomnia.
4. Verificar `x-request-id` na resposta.
5. Procurar o mesmo identificador nos logs/Sentry/Faro.
6. Rodar SQL read-only se o problema envolver estado persistido.
7. Classificar o erro:
   - autenticação;
   - autorização/workspace;
   - CSRF;
   - payload/contrato;
   - conflito de regra de negócio;
   - rate limit;
   - provider externo;
   - bug.

## 3. Quando não é bug

Nem todo erro é bug da API. Exemplos:

- `401` sem cookie de sessão válido;
- `403` em mutação sem `X-CSRF-Token`;
- `403` de staff tentando rota exclusiva de owner;
- `409` ao abrir mesa já ocupada;
- `429` por repetição automática agressiva;
- barcode sem resposta em provider externo, desde que o cadastro manual funcione.

## 4. Quando escalar

Escalar para manutenção de código quando:

- a API diverge do OpenAPI;
- o mesmo request válido falha de forma reprodutível;
- SQL prova estado incoerente;
- logs mostram exceção não tratada;
- há suspeita de IDOR, bypass de workspace, vazamento de PII ou confirmação financeira indevida;
- fluxo P0 foi afetado: auth, comanda, cozinha, caixa, pagamento, impressão ou webhook.

## 5. Fontes

- `docs/operations/developer-support-playbook.md`
- `docs/operations/developer-support-diagnostic-template.md`
- `docs/operations/developer-support-http-examples.md`
- `docs/operations/developer-support-sql-audit-playbook.md`
