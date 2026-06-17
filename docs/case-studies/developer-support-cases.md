# Developer Support Cases

Esta página é o índice público dos casos de suporte técnico para desenvolvedores.

A fonte operacional detalhada está em:

- `docs/operations/developer-support-case-studies.md`

## Casos cobertos

1. `401` em `/api/v1/auth/me`.
2. Funcionário recebe `403` em endpoint de owner.
3. Payload inválido em criação de produto.
4. `409` ao abrir comanda ou mesa.
5. Item de comida não aparece na cozinha.
6. Pagamento Point aprovado não fecha comanda.
7. Webhook duplicado.
8. Barcode não reconhecido no cadastro rápido.
9. API responde certo, mas PWA mostra estado antigo.

## Como adicionar um novo caso

Um caso só deve entrar aqui quando houver:

- sintoma claro;
- reprodução ou evidência suficiente;
- `x-request-id` quando aplicável;
- SQL read-only, quando envolver estado persistido;
- causa raiz ou hipótese falsificável;
- resposta técnica reutilizável.
