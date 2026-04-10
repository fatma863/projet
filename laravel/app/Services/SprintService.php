<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SprintService
{
    public function startSprint(Project $project, Sprint $sprint): Sprint
    {
        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($sprint->status === 'completed') {
            throw ValidationException::withMessages([
                'sprint' => 'Ce sprint est terminé et ne peut pas être démarré.',
            ]);
        }

        if ($sprint->status === 'active') {
            throw ValidationException::withMessages([
                'sprint' => 'Ce sprint est déjà actif.',
            ]);
        }

        if ($sprint->status !== 'planned') {
            throw ValidationException::withMessages([
                'sprint' => 'Seul un sprint planifié peut être démarré.',
            ]);
        }

        DB::transaction(function () use ($project, $sprint): void {
            $project->sprints()
                ->where('status', 'active')
                ->where('id', '!=', $sprint->id)
                ->update(['status' => 'completed', 'ended_at' => now()]);

            $sprint->update([
                'status' => 'active',
                'started_at' => now(),
            ]);
        });

        return $sprint->fresh();
    }

    public function completeSprint(Project $project, Sprint $sprint): Sprint
    {
        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($sprint->status !== 'active') {
            throw ValidationException::withMessages([
                'sprint' => 'Seul un sprint actif peut être terminé.',
            ]);
        }

        $sprint->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        return $sprint->fresh();
    }

    public function updateSprint(Project $project, Sprint $sprint, array $data): Sprint
    {
        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($sprint->status === 'completed') {
            throw ValidationException::withMessages([
                'sprint' => 'Ce sprint est terminé : modification impossible.',
            ]);
        }

        $sprint->update($data);

        return $sprint->fresh();
    }

    public function deleteSprint(Project $project, Sprint $sprint): void
    {
        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($sprint->status === 'active') {
            throw ValidationException::withMessages([
                'sprint' => 'Impossible de supprimer un sprint actif. Terminez-le d’abord.',
            ]);
        }

        $sprint->delete();
    }

    /**
     * @param  list<int>  $orderedTaskIds
     */
    public function reorderBacklog(Project $project, array $orderedTaskIds): void
    {
        $raw = array_map('intval', $orderedTaskIds);
        if (count($raw) !== count(array_unique($raw))) {
            throw ValidationException::withMessages([
                'task_ids' => 'Chaque tâche ne doit apparaître qu’une fois.',
            ]);
        }

        $ordered = array_values($raw);

        $backlogIds = Task::query()
            ->where('project_id', $project->id)
            ->whereNull('sprint_id')
            ->orderBy('position')
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if (count($ordered) !== count($backlogIds)) {
            throw ValidationException::withMessages([
                'task_ids' => 'La liste doit contenir toutes les tâches du backlog, dans le nouvel ordre.',
            ]);
        }

        $a = $ordered;
        $b = $backlogIds;
        sort($a);
        sort($b);
        if ($a !== $b) {
            throw ValidationException::withMessages([
                'task_ids' => 'Les identifiants ne correspondent pas au backlog du projet.',
            ]);
        }

        DB::transaction(function () use ($ordered): void {
            foreach ($ordered as $position => $taskId) {
                Task::query()->where('id', $taskId)->update(['position' => $position]);
            }
        });
    }

    public function assignTaskToSprint(Project $project, Sprint $sprint, Task $task, int $userId): Task
    {
        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        if ($sprint->status === 'completed') {
            throw ValidationException::withMessages([
                'sprint' => 'Impossible d’assigner une tâche à un sprint terminé.',
            ]);
        }

        $task->update([
            'sprint_id' => $sprint->id,
            'updated_by' => $userId,
        ]);

        return $task->fresh();
    }

    public function assertSprintAcceptsTaskAssignment(Project $project, ?Sprint $sprint): void
    {
        if ($sprint === null) {
            return;
        }

        $this->ensureSprintBelongsToProject($project, $sprint);

        if ($sprint->status === 'completed') {
            throw ValidationException::withMessages([
                'sprint_id' => 'Impossible d’assigner une tâche à un sprint terminé.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validatedData
     */
    public function assertTaskEditableWhenSprintFrozen(Task $task, array $validatedData): void
    {
        $task->loadMissing('sprint');

        if (! $task->sprint || $task->sprint->status !== 'completed') {
            return;
        }

        // Champs autorisés même sur un sprint terminé
        $allowed = ['sprint_id', 'workflow_status', 'progress_percent', 'updated_by'];
        $keys = array_diff(array_keys($validatedData), $allowed);

        if (! empty($keys)) {
            throw ValidationException::withMessages([
                'task' => 'Ce sprint est terminé : seuls le statut, la progression et le déplacement de sprint sont autorisés.',
            ]);
        }
    }

    /**
     * La date de fin doit être strictement postérieure à la date de début lorsque les deux sont renseignées.
     */
    public function assertValidSprintDateRange(?string $startDate, ?string $endDate): void
    {
        if ($startDate === null || $endDate === null || $startDate === '' || $endDate === '') {
            return;
        }

        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();

        if ($end->lte($start)) {
            throw ValidationException::withMessages([
                'end_date' => 'La date de fin doit être postérieure à la date de début.',
            ]);
        }
    }

    private function ensureSprintBelongsToProject(Project $project, Sprint $sprint): void
    {
        if ($sprint->project_id !== $project->id) {
            abort(404);
        }
    }
}
