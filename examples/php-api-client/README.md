# Desk Imperial PHP API Client Example

Este exemplo mostra como um cliente PHP pode consumir a API do Desk Imperial sem depender de framework.

Ele existe como material de Developer Support:

- testar health;
- fazer login;
- preservar cookies;
- ler status code;
- capturar `x-request-id`;
- tratar `401`, `403`, `409`, `422/400` e `429` com mensagens claras.

## Segurança

Não versionar:

- senha real;
- cookie;
- token;
- PIN;
- segredo de webhook;
- domínio interno;
- dado de cliente.

Use variáveis de ambiente.

## Como executar

```bash
composer dump-autoload
DESK_API_BASE_URL=http://localhost:4000/api/v1 php examples/health.php
DESK_API_BASE_URL=http://localhost:4000/api/v1 DESK_OWNER_EMAIL=owner@example.com DESK_OWNER_PASSWORD=secret php examples/login.php
```

No Windows PowerShell:

```powershell
$env:DESK_API_BASE_URL='http://localhost:4000/api/v1'
$env:DESK_OWNER_EMAIL='owner@example.com'
$env:DESK_OWNER_PASSWORD='secret'
php .\examples\health.php
php .\examples\login.php
```

## Limite

Este não é SDK oficial. É um exemplo pequeno para entrevista, documentação e reprodução de problemas por clientes desenvolvedores.
