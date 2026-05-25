<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectUserRole;
use App\Models\User;
use App\Support\AccessControl;
use Spatie\Permission\Models\Role;

/**
 * Single-responsibility service that resolves the effective set of permissions
 * for a user, optionally scoped to a project.
 *
 * Resolution order (highest wins):
 *   1. project_user_roles.denied_permissions   → always excluded
 *   2. project_user_roles.granted_permissions   → always included
 *   3. project_user_roles.role                  → role permissions (project-scoped override)
 *   4. user global Spatie role permissions
 *   5. user direct Spatie permissions
 */
class PermissionResolver
{
    /** Per-request cache: "userId:projectId" → string[] */
    private array $cache = [];

    /**
     * Resolve the effective permission slugs for $user,
     * optionally scoped to $projectId.
     *
     * @return string[]
     */
    public function resolvePermissions(User $user, ?int $projectId = null): array
    {
        $cacheKey = $user->id . ':' . ($projectId ?? 'global');

        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        // Base permissions from global role(s)
        $base = $user->getAllPermissions()->pluck('name')->toArray();

        if ($projectId === null) {
            return $this->cache[$cacheKey] = array_values(array_unique($base));
        }

        // Project-scoped override row
        $override = ProjectUserRole::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->with('role.permissions')
            ->first();

        if ($override === null) {
            return $this->cache[$cacheKey] = array_values(array_unique($base));
        }

        // If a project-specific role is set, start from that role's permissions
        if ($override->role_id !== null && $override->role !== null) {
            $base = $override->role->permissions->pluck('name')->toArray();
        }

        // Add explicitly granted permissions
        $granted = $override->granted_permissions ?? [];
        $merged  = array_unique(array_merge($base, $granted));

        // Remove explicitly denied permissions
        $denied = $override->denied_permissions ?? [];
        $final  = array_values(array_diff($merged, $denied));

        return $this->cache[$cacheKey] = $final;
    }

    /**
     * Check whether $user has $permission, optionally scoped to a project.
     */
    public function userCan(User $user, string $permission, ?int $projectId = null): bool
    {
        // System admin always wins
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        return in_array($permission, $this->resolvePermissions($user, $projectId), true);
    }

    /** Flush per-request cache (useful in tests). */
    public function flushCache(): void
    {
        $this->cache = [];
    }
}
