<?php

namespace App\Http\Resources;

use App\Http\Resources\SpecialtyResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roles = $this->getRoleNames();

        $avatarPath = $this->avatar ?: $this->profile_photo;
        // URL relative pour que le frontend (ex. Vite :5173) charge via le même origine + proxy `/storage`.
        $avatarUrl = null;
        if ($avatarPath) {
            $normalized = str_replace('\\', '/', $avatarPath);
            $avatarUrl = '/storage/'.$normalized;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status ?? 'active',
            'avatar' => $this->avatar,
            'profile_photo' => $this->profile_photo ?? $this->avatar,
            'avatar_url' => $avatarUrl,
            'timezone' => $this->timezone,
            'locale' => $this->locale ?? 'fr',
            'roles' => $roles,
            /** Rôle applicatif principal (Spatie) : admin | member | guest (viewer) */
            'role' => $roles->first() ?? 'member',
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'notify_in_app' => (bool) ($this->notify_in_app ?? true),
            'notify_email' => (bool) ($this->notify_email ?? false),
            'notify_type_task_assigned' => (bool) ($this->notify_type_task_assigned ?? true),
            'notify_type_comment' => (bool) ($this->notify_type_comment ?? true),
            'notify_type_task_delayed' => (bool) ($this->notify_type_task_delayed ?? true),
            'theme' => $this->theme,
            'created_at' => $this->created_at?->toISOString(),
            'specialties' => $this->when(
                $this->relationLoaded('specialties'),
                fn () => SpecialtyResource::collection($this->specialties),
            ),
        ];
    }
}
