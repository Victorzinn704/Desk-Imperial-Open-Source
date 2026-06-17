# Laravel Integration Notes

**Objetivo:** mostrar como um cliente Laravel consumiria a API do Desk Imperial em um contexto de suporte a desenvolvedores.

O Desk Imperial não usa Laravel no backend. O backend principal é NestJS. Este documento existe porque muitos consumidores de API no mercado PHP usam Laravel, e a vaga de Developer Support cita Laravel como diferencial.

## 1. O que o cliente Laravel precisa respeitar

- preservar cookies entre `login` e chamadas autenticadas;
- ler o cookie CSRF emitido pela API;
- reenviar o valor no header `X-CSRF-Token` em mutações;
- capturar `x-request-id` de toda resposta;
- tratar `401`, `403`, `409`, `429` e `500` de forma distinta;
- nunca logar cookie, senha, token, PIN ou dado sensível.

## 1.1 Exemplo copiável

Além do exemplo conceitual abaixo, existe um esqueleto copiável em:

- `examples/laravel-api-client/`

Ele inclui:

- `config/desk-imperial.php`;
- `app/Services/DeskImperialClient.php`;
- `tests/Feature/DeskImperialClientContractTest.php`.

O teste usa `Http::fake()` e não chama a API real. Ele serve para validar o comportamento do cliente dentro de uma aplicação Laravel.

## 2. Configuração sugerida

```php
// config/services.php
return [
    'desk_imperial' => [
        'base_url' => env('DESK_IMPERIAL_API_URL', 'http://localhost:4000/api/v1'),
        'email' => env('DESK_IMPERIAL_EMAIL'),
        'password' => env('DESK_IMPERIAL_PASSWORD'),
    ],
];
```

Não versionar `.env` com credenciais reais.

## 3. Cliente Laravel com cookie jar

Exemplo conceitual para um service dentro de uma aplicação Laravel:

```php
<?php

namespace App\Services;

use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final class DeskImperialClient
{
    private CookieJar $cookies;
    private ?string $csrfToken = null;

    public function __construct(private readonly string $baseUrl)
    {
        $this->cookies = new CookieJar();
    }

    public function login(string $email, string $password): Response
    {
        $response = Http::withOptions(['cookies' => $this->cookies])
            ->asJson()
            ->post($this->baseUrl . '/auth/login', [
                'email' => $email,
                'loginMode' => 'OWNER',
                'password' => $password,
            ]);

        $this->csrfToken = $this->readCsrfTokenFromJar();

        return $response;
    }

    public function me(): Response
    {
        return Http::withOptions(['cookies' => $this->cookies])
            ->acceptJson()
            ->get($this->baseUrl . '/auth/me');
    }

    public function openComanda(array $payload): Response
    {
        return Http::withOptions(['cookies' => $this->cookies])
            ->withHeaders($this->csrfHeaders())
            ->asJson()
            ->post($this->baseUrl . '/operations/comandas', $payload);
    }

    private function csrfHeaders(): array
    {
        return $this->csrfToken
            ? ['X-CSRF-Token' => $this->csrfToken]
            : [];
    }

    private function readCsrfTokenFromJar(): ?string
    {
        foreach ($this->cookies->toArray() as $cookie) {
            if (in_array($cookie['Name'], ['partner_csrf', '__Host-partner_csrf'], true)) {
                return urldecode($cookie['Value']);
            }
        }

        return null;
    }
}
```

## 4. Tratamento de erro recomendado

```php
$response = $client->openComanda([
    'tableLabel' => 'Mesa 1',
    'participantCount' => 2,
]);

$requestId = $response->header('x-request-id');

match ($response->status()) {
    200, 201 => logger()->info('Comanda criada', ['requestId' => $requestId]),
    401 => logger()->warning('Sessão ausente ou expirada', ['requestId' => $requestId]),
    403 => logger()->warning('Sem permissão ou CSRF inválido', ['requestId' => $requestId]),
    409 => logger()->notice('Conflito de regra de negócio', ['requestId' => $requestId]),
    429 => logger()->warning('Rate limit', ['requestId' => $requestId]),
    default => logger()->error('Falha ao chamar Desk Imperial', [
        'status' => $response->status(),
        'requestId' => $requestId,
    ]),
};
```

## 5. Testes no Laravel

O consumidor Laravel deve testar:

- login preserva cookie;
- `/auth/me` funciona após login;
- mutação sem CSRF retorna `403`;
- mutação com CSRF passa da barreira de segurança;
- `x-request-id` é registrado em logs;
- `409` não vira exceção genérica;
- `429` respeita backoff.

## 6. Limites deste guia

Este guia não transforma o Desk em aplicação Laravel. Ele mostra como um consumidor Laravel deveria integrar de forma segura com uma API que usa cookie HttpOnly, CSRF double-submit, status codes claros e rastreabilidade por request id.
