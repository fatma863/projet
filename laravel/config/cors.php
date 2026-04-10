<?php

$frontendUrlsRaw = env('FRONTEND_URLS', env('FRONTEND_URL', 'http://localhost:5173'));
$frontendUrls = array_values(array_filter(array_map(
    static fn (string $origin): string => rtrim(trim($origin), '/'),
    explode(',', (string) $frontendUrlsRaw)
)));

if ($frontendUrls === []) {
    $frontendUrls = ['http://localhost:5173'];
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $frontendUrls,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
