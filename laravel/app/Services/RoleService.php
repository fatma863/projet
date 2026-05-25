<?php

namespace App\Services;

use App\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function create(array $data, User $actor): Role
    {
        $role = DB::transaction(function () use ($data) {
            $role = Role::create([
                'name'        => $data['name'],
                'guard_name'  => 'web',
                'description' => $data['description'] ?? null,
                'color'       => $data['color'] ?? '#6366f1',
                'icon'        => $data['icon'] ?? 'Shield',
                'level'       => $data['level'] ?? 10,
                'is_system'   => false,
                'is_archived' => false,
            ]);

            if (!empty($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }

            return $role->load('permissions');
        });

        $this->audit('role', $role->id, 'role_created', null, ['role_name' => $role->name], $actor->id);
        $this->clearCache();

        return $role;
    }

    public function update(Role $role, array $data, User $actor): Role
    {
        $this->guardSystem($role, 'name');

        DB::transaction(function () use ($role, $data) {
            $role->update(array_filter([
                'name'        => $data['name'] ?? $role->name,
                'description' => $data['description'] ?? $role->description,
                'color'       => $data['color'] ?? $role->color,
                'icon'        => $data['icon'] ?? $role->icon,
                'level'       => $data['level'] ?? $role->level,
            ], fn ($v) => $v !== null));
        });

        $this->audit('role', $role->id, 'role_updated', null, ['fields' => array_keys($data)], $actor->id);
        $this->clearCache();

        return $role->fresh('permissions');
    }

    public function syncPermissions(Role $role, array $permissionSlugs, User $actor): Role
    {
        $role->syncPermissions($permissionSlugs);
        $this->audit('role', $role->id, 'permission_synced', null, [
            'permissions' => $permissionSlugs,
            'count'       => count($permissionSlugs),
        ], $actor->id);
        $this->clearCache();

        return $role->fresh('permissions');
    }

    public function grantPermission(Role $role, string $permissionSlug, User $actor): void
    {
        $role->givePermissionTo($permissionSlug);
        $this->audit('role', $role->id, 'granted', $permissionSlug, ['role_name' => $role->name], $actor->id);
        $this->clearCache();
    }

    public function revokePermission(Role $role, string $permissionSlug, User $actor): void
    {
        $role->revokePermissionTo($permissionSlug);
        $this->audit('role', $role->id, 'revoked', $permissionSlug, ['role_name' => $role->name], $actor->id);
        $this->clearCache();
    }

    public function duplicate(Role $source, string $newName, User $actor): Role
    {
        $clone = DB::transaction(function () use ($source, $newName) {
            $clone = Role::create([
                'name'        => $newName,
                'guard_name'  => 'web',
                'description' => ($source->description ?? '') . ' (copie)',
                'color'       => $source->color,
                'icon'        => $source->icon,
                'level'       => $source->level,
                'is_system'   => false,
                'is_archived' => false,
            ]);

            $clone->syncPermissions($source->permissions);

            return $clone->load('permissions');
        });

        $this->audit('role', $clone->id, 'role_cloned', null, [
            'source_role_id'   => $source->id,
            'source_role_name' => $source->name,
        ], $actor->id);
        $this->clearCache();

        return $clone;
    }

    public function toggleArchive(Role $role, User $actor): Role
    {
        $this->guardSystem($role, 'archive');

        $role->update(['is_archived' => !$role->is_archived]);

        $this->audit('role', $role->id,
            $role->is_archived ? 'role_archived' : 'role_unarchived',
            null, ['role_name' => $role->name], $actor->id);
        $this->clearCache();

        return $role->fresh();
    }

    public function delete(Role $role, User $actor): void
    {
        $this->guardSystem($role, 'delete');

        $this->audit('role', $role->id, 'role_deleted', null, ['role_name' => $role->name], $actor->id);

        DB::transaction(fn () => $role->delete());

        $this->clearCache();
    }

    public function assignToUser(User $target, string $roleName, User $actor): void
    {
        $target->syncRoles([$roleName]);
        $this->audit('user', $target->id, 'role_assigned', $roleName, ['role_name' => $roleName], $actor->id);
        $this->clearCache();
    }

    // ────────────────────────────────────────────────────────────────────────

    /**
     * Write an audit log entry. Never throws — audit failure must not break business logic.
     */
    private function audit(
        string $targetType,
        int $targetId,
        string $action,
        ?string $permissionName = null,
        ?array $context = null,
        ?int $performedBy = null,
    ): void {
        try {
            PermissionAuditLog::record($targetType, $targetId, $action, $permissionName, $context, $performedBy);
        } catch (\Throwable) {
            // Audit logging is non-critical; swallow silently
        }
    }

    private function guardSystem(Role $role, string $operation): void
    {
        if ($role->is_system) {
            throw new \RuntimeException(
                "Le rôle système « {$role->name} » ne peut pas être {$operation}."
            );
        }
    }

    private function clearCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
