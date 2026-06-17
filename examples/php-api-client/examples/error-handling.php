<?php

declare(strict_types=1);

require __DIR__ . '/../src/DeskImperialClient.php';

use DeskImperial\Support\DeskImperialClient;

$baseUrl = getenv('DESK_API_BASE_URL') ?: 'http://localhost:4000/api/v1';
$cookieFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'desk-imperial-error-demo-cookies.txt';
@unlink($cookieFile);

$client = new DeskImperialClient($baseUrl, $cookieFile);
$response = $client->me();

printf("Status: %d\n", $response['status']);
printf("Request ID: %s\n", $response['requestId'] ?? '<none>');

switch ($response['status']) {
    case 200:
        echo "Sessão válida.\n";
        break;
    case 401:
        echo "Sessão ausente ou expirada. Faça login novamente.\n";
        break;
    case 403:
        echo "Sessão autenticada sem permissão ou CSRF inválido.\n";
        break;
    case 429:
        echo "Rate limit. Reduza retries automáticos e respeite Retry-After quando presente.\n";
        break;
    default:
        echo "Investigue pelo x-request-id, logs e corpo sanitizado da resposta.\n";
        print_r($response['body']);
}
