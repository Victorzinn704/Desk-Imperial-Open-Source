<?php

declare(strict_types=1);

namespace DeskImperial\Support;

final class DeskImperialClient
{
    private string $baseUrl;
    private string $cookieFile;
    private ?string $csrfToken = null;

    public function __construct(string $baseUrl, ?string $cookieFile = null)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->cookieFile = $cookieFile ?? sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'desk-imperial-cookies.txt';
    }

    /**
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function health(): array
    {
        return $this->request('GET', '/health');
    }

    /**
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function login(string $email, string $password): array
    {
        $response = $this->request('POST', '/auth/login', [
            'email' => $email,
            'loginMode' => 'OWNER',
            'password' => $password,
        ]);

        $this->csrfToken = $this->extractCsrfTokenFromCookies();

        return $response;
    }

    /**
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function me(): array
    {
        return $this->request('GET', '/auth/me');
    }

    /**
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function listProducts(): array
    {
        return $this->request('GET', '/products');
    }

    /**
     * @param array<string,mixed> $payload
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function openComanda(array $payload): array
    {
        return $this->request('POST', '/operations/comandas', $payload, true);
    }

    /**
     * @param array<string,mixed>|null $payload
     * @return array{status:int,headers:array<string,string>,body:mixed,requestId:?string}
     */
    public function request(string $method, string $path, ?array $payload = null, bool $requiresCsrf = false): array
    {
        $headers = ['Accept: application/json'];
        $body = null;

        if ($payload !== null) {
            $body = json_encode($payload, JSON_THROW_ON_ERROR);
            $headers[] = 'Content-Type: application/json';
        }

        if ($requiresCsrf && $this->csrfToken !== null) {
            $headers[] = 'X-CSRF-Token: ' . $this->csrfToken;
        }

        $responseHeaders = [];
        $handle = curl_init($this->baseUrl . $path);

        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$responseHeaders): int {
                $length = strlen($line);
                $parts = explode(':', $line, 2);

                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }

                return $length;
            },
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_COOKIEJAR => $this->cookieFile,
            CURLOPT_COOKIEFILE => $this->cookieFile,
            CURLOPT_TIMEOUT => 15,
        ]);

        if ($body !== null) {
            curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
        }

        $rawBody = curl_exec($handle);

        if ($rawBody === false) {
            $error = curl_error($handle);
            curl_close($handle);

            throw new \RuntimeException('Falha HTTP: ' . $error);
        }

        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);

        return [
            'status' => $status,
            'headers' => $responseHeaders,
            'body' => $this->decodeBody((string) $rawBody),
            'requestId' => $responseHeaders['x-request-id'] ?? null,
        ];
    }

    private function decodeBody(string $rawBody): mixed
    {
        if ($rawBody === '') {
            return null;
        }

        try {
            return json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $rawBody;
        }
    }

    private function extractCsrfTokenFromCookies(): ?string
    {
        if (!is_file($this->cookieFile)) {
            return null;
        }

        $lines = file($this->cookieFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return null;
        }

        foreach ($lines as $line) {
            if (str_starts_with($line, '#')) {
                continue;
            }

            $columns = preg_split('/\s+/', $line);
            if ($columns === false || count($columns) < 7) {
                continue;
            }

            $name = $columns[5];
            $value = $columns[6];

            if ($name === 'partner_csrf' || $name === '__Host-partner_csrf') {
                return urldecode($value);
            }
        }

        return null;
    }
}
