# Customer Diagnostic Template

Este é o template curto para pedir informações a um desenvolvedor/cliente sem expor dados sensíveis.

```text
Ambiente:
Endpoint:
Método HTTP:
Status code:
x-request-id:
Horário aproximado:
Usuário/role afetado:
Fluxo afetado:
O que esperava acontecer:
O que aconteceu:
Payload sanitizado:
Resposta sanitizada:
```

## Orientação para cliente/desenvolvedor

Não envie:

- senha;
- token;
- cookie;
- PIN;
- CPF/CNPJ real;
- cartão;
- segredo de webhook;
- certificado;
- private key;
- terminal ID real.

## Resposta técnica sugerida

```text
Obrigado pelas informações. Com o x-request-id e o horário, vamos correlacionar a requisição nos logs e validar o estado com consulta read-only quando necessário. Se o erro for de contrato, retornaremos o payload esperado; se for regra de negócio, explicaremos o estado que bloqueou a operação; se for falha interna, escalaremos com evidência técnica.
```
