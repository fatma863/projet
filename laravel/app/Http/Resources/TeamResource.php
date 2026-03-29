<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'team_leader_id' => $this->team_leader_id,
            'team_leader' => $this->when(
                $this->relationLoaded('leader'),
                fn () => $this->leader ? new UserResource($this->leader) : null,
            ),
            'members_count' => $this->whenCounted('members'),
            'members' => TeamMemberResource::collection($this->whenLoaded('members')),
            'projects_count' => $this->whenCounted('projects'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
