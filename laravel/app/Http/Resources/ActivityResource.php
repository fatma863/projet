<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'actor' => $this->whenLoaded('user', function () {
                $path = $this->user->avatar ?: $this->user->profile_photo;
                $avatarUrl = null;
                if ($path) {
                    $normalized = str_replace('\\', '/', $path);
                    $avatarUrl = '/storage/'.$normalized;
                }

                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'avatar_url' => $avatarUrl,
                ];
            }),
            'action' => $this->action,
            'target_type' => $this->target_type,
            'target_id' => $this->target_id,
            'project_id' => $this->project_id,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
