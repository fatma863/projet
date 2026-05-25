<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'project_id'     => $this->project_id,
            'project_name'   => $this->whenLoaded('project', fn () => $this->project?->name),
            'actor'          => new UserResource($this->whenLoaded('actor')),
            'entity_type'    => $this->entity_type,
            'entity_id'      => $this->entity_id,
            'action'         => $this->action,
            'meta'           => $this->meta ?? [],
            'old_values'     => $this->old_values,
            'new_values'     => $this->new_values,
            'changed_fields' => $this->changed_fields,
            'severity'       => $this->severity ?? 'info',
            'source'         => $this->source ?? 'web',
            'actor_role'     => $this->actor_role,
            'ip_address'     => $request->user()?->hasRole('admin') ? $this->ip_address : null,
            'created_at'     => $this->created_at?->toISOString(),
        ];
    }
}
