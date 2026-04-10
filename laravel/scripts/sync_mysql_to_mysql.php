<?php

declare(strict_types=1);

/**
 * Copy all base tables and data from local Laravel .env MySQL database
 * to a target MySQL database (Railway).
 *
 * Usage:
 * php scripts/sync_mysql_to_mysql.php \
 *   --target-host=mainline.proxy.rlwy.net \
 *   --target-port=25777 \
 *   --target-db=railway \
 *   --target-user=root \
 *   --target-pass=your_password
 */

function stderr(string $message): void
{
    fwrite(STDERR, $message . PHP_EOL);
}

function parseEnvFile(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException(".env file not found: {$path}");
    }

    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        throw new RuntimeException("Unable to read .env file: {$path}");
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        $vars[$key] = $value;
    }

    return $vars;
}

function quoteIdentifier(string $name): string
{
    return '`' . str_replace('`', '``', $name) . '`';
}

$options = getopt('', [
    'target-host:',
    'target-port:',
    'target-db:',
    'target-user:',
    'target-pass:',
    'source-env::',
]);

$required = ['target-host', 'target-port', 'target-db', 'target-user', 'target-pass'];
foreach ($required as $key) {
    if (!isset($options[$key]) || $options[$key] === '') {
        stderr("Missing required option --{$key}");
        exit(1);
    }
}

$sourceEnvPath = $options['source-env'] ?? __DIR__ . '/../.env';

try {
    $env = parseEnvFile($sourceEnvPath);

    $sourceDriver = $env['DB_CONNECTION'] ?? 'mysql';
    if ($sourceDriver !== 'mysql') {
        throw new RuntimeException("Source DB_CONNECTION must be mysql, got: {$sourceDriver}");
    }

    $sourceHost = $env['DB_HOST'] ?? '127.0.0.1';
    $sourcePort = $env['DB_PORT'] ?? '3306';
    $sourceDb = $env['DB_DATABASE'] ?? '';
    $sourceUser = $env['DB_USERNAME'] ?? '';
    $sourcePass = $env['DB_PASSWORD'] ?? '';

    if ($sourceDb === '' || $sourceUser === '') {
        throw new RuntimeException('Source DB_DATABASE and DB_USERNAME are required in .env');
    }

    $targetHost = (string) $options['target-host'];
    $targetPort = (string) $options['target-port'];
    $targetDb = (string) $options['target-db'];
    $targetUser = (string) $options['target-user'];
    $targetPass = (string) $options['target-pass'];

    $sourceDsn = "mysql:host={$sourceHost};port={$sourcePort};dbname={$sourceDb};charset=utf8mb4";
    $targetDsn = "mysql:host={$targetHost};port={$targetPort};dbname={$targetDb};charset=utf8mb4";

    $pdoOptions = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    echo "Connecting source {$sourceHost}:{$sourcePort}/{$sourceDb}" . PHP_EOL;
    $sourcePdo = new PDO($sourceDsn, $sourceUser, $sourcePass, $pdoOptions);

    echo "Connecting target {$targetHost}:{$targetPort}/{$targetDb}" . PHP_EOL;
    $targetPdo = new PDO($targetDsn, $targetUser, $targetPass, $pdoOptions);

    $tableStmt = $sourcePdo->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    $tablesRaw = $tableStmt->fetchAll(PDO::FETCH_NUM);
    $tables = array_map(static fn(array $row): string => (string) $row[0], $tablesRaw);

    if (count($tables) === 0) {
        throw new RuntimeException('No source tables found.');
    }

    echo 'Found ' . count($tables) . " source tables." . PHP_EOL;

    $targetPdo->exec('SET FOREIGN_KEY_CHECKS=0');

    foreach ($tables as $table) {
        $qTable = quoteIdentifier($table);
        echo "Sync table: {$table}" . PHP_EOL;

        $createStmt = $sourcePdo->query('SHOW CREATE TABLE ' . $qTable)->fetch(PDO::FETCH_ASSOC);
        if (!$createStmt || !isset($createStmt['Create Table'])) {
            throw new RuntimeException("Unable to read CREATE TABLE for {$table}");
        }

        // Recreate each table so target schema stays identical to source schema.
        $targetPdo->exec('DROP TABLE IF EXISTS ' . $qTable);
        $targetPdo->exec($createStmt['Create Table']);
        echo "  Recreated table on target." . PHP_EOL;

        $dataStmt = $sourcePdo->query('SELECT * FROM ' . $qTable);
        $insertStmt = null;
        $rowCount = 0;

        while ($row = $dataStmt->fetch(PDO::FETCH_ASSOC)) {
            if ($insertStmt === null) {
                $columns = array_keys($row);
                $columnSql = implode(', ', array_map('quoteIdentifier', $columns));
                $placeholders = implode(', ', array_fill(0, count($columns), '?'));
                $sql = 'INSERT INTO ' . $qTable . ' (' . $columnSql . ') VALUES (' . $placeholders . ')';
                $insertStmt = $targetPdo->prepare($sql);
            }

            $insertStmt->execute(array_values($row));
            $rowCount++;
        }

        echo "  Imported {$rowCount} rows." . PHP_EOL;
    }

    $targetPdo->exec('SET FOREIGN_KEY_CHECKS=1');

    echo 'Sync completed successfully.' . PHP_EOL;
    exit(0);
} catch (Throwable $e) {
    stderr('Error: ' . $e->getMessage());
    exit(1);
}
