<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $path = $this->avatar ?: $this->profile_photo;
        $avatarUrl = $path ? '/storage/'.str_replace('\\', '/', $path) : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar,
            'avatar_url' => $avatarUrl,
            'project_role' => $this->pivot?->project_role,
        ];
    }
}
