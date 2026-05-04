<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class TrainMLModel extends Command
{
    protected $signature   = 'ml:train';
    protected $description = 'Train the ML task-assignment model (Python scikit-learn GBM+RF)';

    public function handle(): int
    {
        $this->info('');
        $this->info('╔═══════════════════════════════════════════════════════╗');
        $this->info('║   ML Task Assignment — Python Training Pipeline        ║');
        $this->info('╚═══════════════════════════════════════════════════════╝');

        $pythonDir   = realpath(base_path('../python/ml'));
        $trainScript = $pythonDir ? realpath($pythonDir . '/train.py') : null;

        if (!$trainScript) {
            $this->error('Python script not found at python/ml/train.py');
            return self::FAILURE;
        }

        $this->info('');
        $this->info('▶  Running Python trainer (scikit-learn GBM+RF ensemble)...');
        $this->line('   ' . $trainScript);

        $process = new Process(['py', $trainScript, '--verbose'], dirname($trainScript));
        $process->setTimeout(120);
        $process->run(function (string $type, string $buffer): void {
            $this->line('   ' . trim($buffer));
        });

        if (!$process->isSuccessful()) {
            $this->error('Python trainer failed (exit code ' . $process->getExitCode() . ')');
            $this->line($process->getErrorOutput());
            return self::FAILURE;
        }

        $output = json_decode(trim($process->getOutput()), true);

        if (!$output || ($output['status'] ?? '') === 'insufficient_data') {
            $this->warn($output['message'] ?? 'Insufficient training data.');
            $this->line('   Run: php artisan ml:seed-training-data  then retry.');
            return self::FAILURE;
        }

        $this->info('');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Model',     $output['model_label'] ?? 'GBM+RF'],
                ['Samples',   $output['n_samples']   ?? '?'],
                ['Accuracy',  isset($output['accuracy'])  ? sprintf('%.2f%%', $output['accuracy']  * 100) : '?'],
                ['Precision', isset($output['precision']) ? sprintf('%.2f%%', $output['precision'] * 100) : '?'],
                ['Recall',    isset($output['recall'])    ? sprintf('%.2f%%', $output['recall']    * 100) : '?'],
                ['F1',        isset($output['f1'])        ? sprintf('%.4f',   $output['f1'])              : '?'],
            ]
        );

        if (!empty($output['importances'])) {
            $this->info('');
            $this->info('─── Top Feature Importances ─────────────────────────');
            arsort($output['importances']);
            $rows = [];
            foreach (array_slice($output['importances'], 0, 8, true) as $feat => $imp) {
                $rows[] = [$feat, sprintf('%.4f', $imp)];
            }
            $this->table(['Feature', 'Importance'], $rows);
        }

        $this->info('');
        $this->info('✅ Model saved to python/ml/models/task_assignment.joblib');
        return self::SUCCESS;
    }
}
