<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SprintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $totalSp = (int) ($this->story_points_total ?? 0);
        $doneSp = (int) ($this->story_points_done ?? 0);
        $tasksCount = (int) ($this->tasks_count ?? 0);
        $doneCount = (int) ($this->tasks_done_count ?? 0);

        $progressPercent = $this->computeProgressPercent($totalSp, $doneSp, $tasksCount, $doneCount);
        $remainingTasks = max(0, $tasksCount - $doneCount);
        $remainingSp = max(0, $totalSp - $doneSp);

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'goal' => $this->goal,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'started_at' => $this->started_at?->toISOString(),
            'ended_at' => $this->ended_at?->toISOString(),
            'tasks_count' => $tasksCount,
            'tasks_done_count' => $doneCount,
            'tasks_remaining_count' => $remainingTasks,
            'total_story_points' => $totalSp,
            'completed_story_points' => $doneSp,
            'remaining_story_points' => $remainingSp,
            'progress_percent' => $progressPercent,
            'velocity' => $doneSp,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function computeProgressPercent(
        int $totalSp,
        int $doneSp,
        int $tasksCount,
        int $doneCount,
    ): int {
        if ($totalSp > 0) {
            return (int) min(100, round(100 * $doneSp / $totalSp));
        }

        if ($tasksCount <= 0) {
            return 0;
        }

        return (int) min(100, round(100 * $doneCount / $tasksCount));
    }
}
