<?php

declare(strict_types=1);

require __DIR__ . '/../src/DeskImperialClient.php';

use DeskImperial\Support\DeskImperialClient;

$baseUrl = getenv('DESK_API_BASE_URL') ?: 'http://localhost:4000/api/v1';
$client = new DeskImperialClient($baseUrl);
$response = $client->health();

printf("Status: %d\n", $response['status']);
printf("Request ID: %s\n", $response['requestId'] ?? '<none>');
print_r($response['body']);
