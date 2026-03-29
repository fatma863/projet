<?php

namespace App\Http\Resources;

use App\Models\Task;
use App\Support\AccessControl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'sprint_id' => $this->sprint_id,
            'parent_id' => $this->parent_id,
            'title' => $this->title,
            'description' => $this->description,
            'status_id' => $this->status_id,
            'status' => new TaskStatusResource($this->whenLoaded('status')),
            'sprint' => new SprintResource($this->whenLoaded('sprint')),
            'priority' => $this->priority,
            'complexity' => $this->complexity,
            'story_points' => $this->story_points,
            'planned_start' => $this->planned_start?->toDateString(),
            'planned_end' => $this->planned_end?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'deadline' => $this->due_date?->toDateString(),
            'start_date' => $this->planned_start?->toDateString(),
            'workflow_status' => $this->workflow_status ?? Task::inferWorkflowStatus($this->resource),
            'estimated_hours' => $this->estimated_hours ? (float) $this->estimated_hours : null,
            'estimated_duration' => $this->estimated_duration,
            'risk_level' => $this->risk_level,
            'risk_score' => $this->risk_score,
            'actual_hours' => (float) $this->actual_hours,
            'progress_percent' => $this->progress_percent,
            'kanban_order' => $this->kanban_order,
            'project' => $this->when(
                $this->relationLoaded('project'),
                fn () => $this->project ? [
                    'id' => $this->project->id,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ] : null,
            ),
            'is_overdue' => $this->isOverdue(),
            'assignees' => TaskAssigneeResource::collection($this->whenLoaded('assignees')),
            'subtasks' => TaskResource::collection($this->whenLoaded('subtasks')),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'dependencies' => TaskDependencyResource::collection($this->whenLoaded('dependencies')),
            'comments_count' => $this->whenCounted('comments'),
            'attachments_count' => $this->whenCounted('attachments'),
            'time_entries_count' => $this->whenCounted('timeEntries'),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'access' => [
                'can_edit' => $user ? AccessControl::canEditTask($user, $this->resource) : false,
                'can_delete' => $user ? AccessControl::canDeleteTask($user, $this->resource) : false,
            ],
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
