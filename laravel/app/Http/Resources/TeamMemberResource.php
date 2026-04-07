<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rawJob = $this->pivot?->role_in_team;
        $jobRole = self::normalizeJobRole($rawJob);

        $skills = json_decode($this->pivot?->skills ?? '[]', true);
        if (! is_array($skills)) {
            $skills = [];
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar,
            'project_role' => $this->resource->getAttribute('project_access_role'),
            'job_role' => $jobRole,
            'role_in_team' => $jobRole,
            'capacity_hours_per_week' => (float) ($this->pivot?->capacity_hours_per_week ?? 40),
            'skills' => array_values(array_filter($skills, fn ($s) => is_string($s) && $s !== '')),
            'is_active' => (bool) ($this->pivot?->is_active ?? true),
            'specialties' => SpecialtyResource::collection($this->whenLoaded('specialties')),
        ];
    }

    /**
     * Rôle métier dans l'équipe : uniquement lead | developer | tester (legacy member/designer → developer).
     */
    public static function normalizeJobRole(?string $role): string
    {
        return match ($role) {
            'lead' => 'lead',
            'tester' => 'tester',
            'developer', 'member', 'designer', null, '' => 'developer',
            default => 'developer',
        };
    }
}
