# Laravel API Client Example

Este exemplo mostra como uma aplicação Laravel consumiria a API do Desk Imperial.

Ele não transforma o Desk Imperial em Laravel. O objetivo é dar material concreto para Developer Support:

- configurar base URL por `.env`;
- preservar cookie jar;
- reenviar CSRF;
- registrar `x-request-id`;
- tratar `401`, `403`, `409`, `429` e erro inesperado.

## Arquivos

```text
config/desk-imperial.php
app/Services/DeskImperialClient.php
tests/Feature/DeskImperialClientContractTest.php
```

## Uso em um app Laravel

1. Copie `config/desk-imperial.php` para `config/desk-imperial.php`.
2. Copie `app/Services/DeskImperialClient.php` para `app/Services/DeskImperialClient.php`.
3. Configure `.env`:

```env
DESK_IMPERIAL_API_URL=http://localhost:4000/api/v1
DESK_IMPERIAL_EMAIL=owner@example.com
DESK_IMPERIAL_PASSWORD=
```

4. Injete `App\Services\DeskImperialClient` em controller, command ou job.

## Segurança

Não versionar senha real. Não logar cookie, CSRF, PIN, segredo de webhook ou payload com dado sensível.

## Teste

O teste incluído usa `Http::fake()` para validar contrato de cliente sem chamar a API real. Ele deve ser copiado para um app Laravel com PHPUnit/Pest configurado.
