<?php
define('LARAVEL_START', microtime(true));
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$users = DB::table('users')->select('id', 'name', 'email')->get();
foreach ($users as $u) {
    echo $u->id . '|' . $u->name . '|' . $u->email . PHP_EOL;
}
$teams = DB::table('teams')->select('id', 'name')->get();
echo "--- TEAMS ---" . PHP_EOL;
foreach ($teams as $t) {
    echo $t->id . '|' . $t->name . PHP_EOL;
}
