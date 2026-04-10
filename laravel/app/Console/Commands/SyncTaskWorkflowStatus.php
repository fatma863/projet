<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Synchronise le champ `workflow_status` de chaque tâche avec son `status_id`.
 *
 * La logique de mappage suit celle de Project::resolveStatusIdForWorkflow() :
 *   - premier statut (order ASC)  → todo
 *   - dernier statut              → done
 *   - colonnes intermédiaires     → in_progress
 *
 * Usage :
 *   php artisan tasks:sync-workflow          # aperçu sans modifier
 *   php artisan tasks:sync-workflow --fix    # applique les corrections
 *   php artisan tasks:sync-workflow --fix --project=2  # projet spécifique
 */
class SyncTaskWorkflowStatus extends Command
{
    protected $signature = 'tasks:sync-workflow
                            {--fix : Appliquer les corrections (sans cette option : aperçu uniquement)}
                            {--project= : Restreindre à un projet spécifique (ID)}';

    protected $description = 'Vérifie et synchronise workflow_status des tâches avec leur status_id';

    public function handle(): int
    {
        $dryRun    = ! $this->option('fix');
        $projectId = $this->option('project');

        if ($dryRun) {
            $this->warn('Mode aperçu (dry-run). Utilisez --fix pour appliquer les changements.');
        }

        $query = Project::with('statuses');
        if ($projectId) {
            $query->where('id', $projectId);
        }

        $projects  = $query->get();
        $totalFix  = 0;
        $totalOk   = 0;

        foreach ($projects as $project) {
            $statuses = $project->statuses()->orderBy('order')->get();
            $n = $statuses->count();

            if ($n === 0) {
                $this->line("  Projet #{$project->id} ({$project->name}) — aucun statut, ignoré.");
                continue;
            }

            // Mappage status_id → workflow_status attendu
            $mapping = [];
            foreach ($statuses as $i => $status) {
                if ($i === 0) {
                    $mapping[$status->id] = 'todo';
                } elseif ($i === $n - 1) {
                    $mapping[$status->id] = 'done';
                } else {
                    $mapping[$status->id] = 'in_progress';
                }
            }

            $tasks = Task::where('project_id', $project->id)
                ->whereNull('deleted_at')
                ->get(['id', 'title', 'status_id', 'workflow_status']);

            $fixes = [];
            foreach ($tasks as $task) {
                $expected = $mapping[$task->status_id] ?? null;
                if ($expected === null) {
                    // status_id orphelin (statut supprimé)
                    $expected = 'todo';
                }
                if ($task->workflow_status !== $expected) {
                    $fixes[] = [
                        'id'       => $task->id,
                        'title'    => mb_substr($task->title, 0, 50),
                        'current'  => $task->workflow_status,
                        'expected' => $expected,
                        'status_id' => $task->status_id,
                    ];
                } else {
                    $totalOk++;
                }
            }

            if (empty($fixes)) {
                $this->line("  <fg=green>✓</> Projet #{$project->id} ({$project->name}) — {$tasks->count()} tâches OK");
                continue;
            }

            $this->newLine();
            $this->line("  <fg=yellow>!</> Projet #{$project->id} ({$project->name}) — {$tasks->count()} tâches, ".count($fixes).' à corriger :');

            $this->table(
                ['task_id', 'Titre', 'status_id', 'workflow_status actuel', 'workflow_status attendu'],
                array_map(fn ($f) => [
                    $f['id'], $f['title'], $f['status_id'], $f['current'], $f['expected'],
                ], $fixes),
            );

            if (! $dryRun) {
                DB::transaction(function () use ($fixes) {
                    foreach ($fixes as $f) {
                        Task::where('id', $f['id'])->update(['workflow_status' => $f['expected']]);
                    }
                });
                $this->info('  → '.count($fixes).' tâche(s) corrigées.');
            }

            $totalFix += count($fixes);
        }

        $this->newLine();
        if ($dryRun) {
            $this->warn("Résumé (dry-run) : {$totalFix} correction(s) nécessaire(s), {$totalOk} déjà cohérente(s).");
            if ($totalFix > 0) {
                $this->line('Relancez avec <fg=cyan>php artisan tasks:sync-workflow --fix</> pour appliquer.');
            }
        } else {
            $this->info("Résumé : {$totalFix} correction(s) appliquée(s), {$totalOk} déjà cohérente(s).");
        }

        return self::SUCCESS;
    }
}
