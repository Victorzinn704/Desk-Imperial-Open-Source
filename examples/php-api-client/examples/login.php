<?php

declare(strict_types=1);

require __DIR__ . '/../src/DeskImperialClient.php';

use DeskImperial\Support\DeskImperialClient;

$baseUrl = getenv('DESK_API_BASE_URL') ?: 'http://localhost:4000/api/v1';
$email = getenv('DESK_OWNER_EMAIL') ?: '';
$password = getenv('DESK_OWNER_PASSWORD') ?: '';

if ($email === '' || $password === '') {
    fwrite(STDERR, "Defina DESK_OWNER_EMAIL e DESK_OWNER_PASSWORD.\n");
    exit(1);
}

$client = new DeskImperialClient($baseUrl);
$login = $client->login($email, $password);

printf("Login status: %d\n", $login['status']);
printf("Login request ID: %s\n", $login['requestId'] ?? '<none>');

$me = $client->me();
printf("Me status: %d\n", $me['status']);
printf("Me request ID: %s\n", $me['requestId'] ?? '<none>');
print_r($me['body']);
