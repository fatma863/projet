<?php

namespace App\Http\Resources;

use App\Support\AccessControl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $projectRole = $user ? AccessControl::projectRole($user, $this->resource) : null;

        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'client_id' => $this->client_id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'chef_id'            => $this->chef_id,
            'chef'               => $this->when(
                $this->relationLoaded('chef'),
                fn () => $this->chef ? new UserResource($this->chef) : null,
            ),
            'project_manager_id' => $this->project_manager_id,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'team' => new TeamResource($this->whenLoaded('team')),
            'client' => new ClientResource($this->whenLoaded('client')),
            'members' => ProjectMemberResource::collection($this->whenLoaded('members')),
            'members_count' => $this->whenCounted('members'),
            'tasks_count' => $this->whenCounted('tasks'),
            'statuses' => TaskStatusResource::collection($this->whenLoaded('statuses')),
            'access' => [
                'is_chef'          => $user ? (int) $this->chef_id === (int) $user->id : false,
                'can_view'         => $user ? AccessControl::canViewProject($user, $this->resource) : false,
                'can_edit'         => $user ? AccessControl::canEditProject($user, $this->resource) : false,
                'can_invite'       => $user ? AccessControl::canInviteToProject($user, $this->resource) : false,
                'can_create_tasks' => $user ? AccessControl::canCreateTaskInProject($user, $this->resource) : false,
            ],
            'progress_percent' => (int) ($this->progress_percent ?? 0),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            // Pause / Resume fields
            'is_paused'       => $this->isPaused(),
            'paused_at'       => $this->paused_at?->toISOString(),
            'paused_by'       => $this->paused_by,
            'pause_reason'    => $this->pause_reason,
            'previous_status' => $this->previous_status,
            'paused_by_user'  => $this->when(
                $this->relationLoaded('pausedBy'),
                fn () => $this->pausedBy ? [
                    'id'     => $this->pausedBy->id,
                    'name'   => $this->pausedBy->name,
                    'avatar' => $this->pausedBy->avatar_url,
                ] : null,
            ),
            // Pause permissions for the requesting user
            'can_pause'  => $user ? app(\App\Policies\ProjectPolicy::class)->pause($user, $this->resource) : false,
            'can_resume' => $user ? app(\App\Policies\ProjectPolicy::class)->resume($user, $this->resource) : false,
        ];
    }
}
