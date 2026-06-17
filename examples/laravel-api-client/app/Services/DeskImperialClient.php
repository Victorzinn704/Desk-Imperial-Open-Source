<?php

declare(strict_types=1);

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

    public static function fromConfig(): self
    {
        return new self(rtrim((string) config('desk-imperial.base_url'), '/'));
    }

    public function health(): Response
    {
        return Http::acceptJson()->get($this->baseUrl . '/health');
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

    /**
     * @param array<string,mixed> $payload
     */
    public function openComanda(array $payload): Response
    {
        return Http::withOptions(['cookies' => $this->cookies])
            ->withHeaders($this->csrfHeaders())
            ->asJson()
            ->post($this->baseUrl . '/operations/comandas', $payload);
    }

    public function requestId(Response $response): ?string
    {
        return $response->header('x-request-id');
    }

    /**
     * @return array<string,string>
     */
    private function csrfHeaders(): array
    {
        if ($this->csrfToken === null) {
            return [];
        }

        return ['X-CSRF-Token' => $this->csrfToken];
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
