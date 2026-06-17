# SQL Audit Playbook

A fonte completa está em:

- `docs/operations/developer-support-sql-audit-playbook.md`

## Regra de segurança

Em suporte técnico, SQL é usado para confirmar hipótese, não para corrigir dado manualmente.

Permitido:

```sql
SELECT ...
```

Não permitido em investigação comum:

```sql
UPDATE ...
DELETE ...
INSERT ...
DROP ...
ALTER ...
TRUNCATE ...
```

## Casos cobertos

- usuário e workspace;
- sessões recentes;
- vínculo de funcionário;
- produto por barcode;
- comandas abertas;
- itens de comanda;
- pagamentos;
- intent Point;
- caixa;
- movimentos;
- duplicidade de webhook;
- itens de cozinha sem status.

Sempre usar placeholders e remover PII de qualquer evidência.
