<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\DeskImperialClient;
use GuzzleHttp\Cookie\SetCookie;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class DeskImperialClientContractTest extends TestCase
{
    public function testLoginPreservesRequestIdAndSessionFlow(): void
    {
        Http::fake([
            '*/auth/login' => Http::response(['ok' => true], 200, ['x-request-id' => 'req-login-1']),
            '*/auth/me' => Http::response(['email' => 'owner@example.com'], 200, ['x-request-id' => 'req-me-1']),
        ]);

        $client = new DeskImperialClient('http://localhost:4000/api/v1');

        $login = $client->login('owner@example.com', 'secret');
        $me = $client->me();

        $this->assertSame(200, $login->status());
        $this->assertSame('req-login-1', $client->requestId($login));
        $this->assertSame(200, $me->status());
        $this->assertSame('req-me-1', $client->requestId($me));
    }

    public function testOpenComandaSendsCsrfWhenCookieWasCaptured(): void
    {
        Http::fake([
            '*/operations/comandas' => Http::response(['id' => 'comanda-1'], 201, ['x-request-id' => 'req-comanda-1']),
        ]);

        $client = new DeskImperialClient('http://localhost:4000/api/v1');
        $this->injectCsrfCookie($client, 'csrf-demo');

        $response = $client->openComanda([
            'tableLabel' => 'Mesa Laravel',
            'participantCount' => 2,
        ]);

        $this->assertSame(201, $response->status());
        $this->assertSame('req-comanda-1', $client->requestId($response));

        Http::assertSent(function ($request): bool {
            return str_ends_with($request->url(), '/operations/comandas')
                && $request->hasHeader('X-CSRF-Token', 'csrf-demo');
        });
    }

    private function injectCsrfCookie(DeskImperialClient $client, string $value): void
    {
        $reflection = new \ReflectionClass($client);
        $property = $reflection->getProperty('cookies');
        $property->setAccessible(true);

        $jar = $property->getValue($client);
        $jar->setCookie(new SetCookie([
            'Name' => 'partner_csrf',
            'Value' => $value,
            'Domain' => 'localhost',
            'Path' => '/',
        ]));

        $method = $reflection->getMethod('readCsrfTokenFromJar');
        $method->setAccessible(true);

        $csrfProperty = $reflection->getProperty('csrfToken');
        $csrfProperty->setAccessible(true);
        $csrfProperty->setValue($client, $method->invoke($client));
    }
}
