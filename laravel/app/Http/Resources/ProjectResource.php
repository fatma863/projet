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
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
