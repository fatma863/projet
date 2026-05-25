<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PermissionAuditLog;
use App\Models\PermissionGroup;
use App\Models\User;
use App\Services\PermissionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function __construct(private readonly PermissionResolver $resolver) {}

    /**
     * GET /api/permissions
     * Returns all permissions, grouped by module.
     */
    public function index(): JsonResponse
    {
        $groups = PermissionGroup::with([
            'permissions' => fn ($q) => $q->orderBy('action'),
        ])->orderBy('order')->get();

        $ungrouped = Permission::whereNull('group_id')
            ->orderBy('name')
            ->get();

        $data = $groups->map(fn (PermissionGroup $g) => [
            'id'          => $g->id,
            'name'        => $g->name,
            'slug'        => $g->slug,
            'icon'        => $g->icon,
            'color'       => $g->color,
            'permissions' => $g->permissions->map(fn ($p) => $this->formatPermission($p))->values(),
        ]);

        if ($ungrouped->isNotEmpty()) {
            $data->push([
                'id'          => null,
                'name'        => 'Autres',
                'slug'        => 'other',
                'icon'        => 'Shield',
                'color'       => '#94a3b8',
                'permissions' => $ungrouped->map(fn ($p) => $this->formatPermission($p))->values(),
            ]);
        }

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/users/{user}/permissions
     * Returns the effective permissions of a user (global + direct).
     */
    public function userPermissions(User $target): JsonResponse
    {
        $global  = $this->resolver->resolvePermissions($target);
        $direct  = $target->getDirectPermissions()->pluck('name');
        $roles   = $target->getRoleNames();

        return response()->json([
            'user_id'             => $target->id,
            'roles'               => $roles,
            'global_permissions'  => $global,
            'direct_permissions'  => $direct,
        ]);
    }

    /**
     * GET /api/users/{user}/permissions/project/{project}
     * Returns the effective permissions of a user scoped to a project.
     */
    public function userProjectPermissions(User $target, int $project): JsonResponse
    {
        $perms = $this->resolver->resolvePermissions($target, $project);

        return response()->json([
            'user_id'    => $target->id,
            'project_id' => $project,
            'permissions' => $perms,
        ]);
    }

    /**
     * POST /api/users/{user}/permissions/grant
     * Grant a direct permission to a user.
     */
    public function grantDirect(Request $request, User $target): JsonResponse
    {
        $data = $request->validate([
            'permission' => 'required|string|exists:permissions,name',
        ]);

        $target->givePermissionTo($data['permission']);
        $this->safeAudit('user', $target->id, 'granted', $data['permission'], ['type' => 'direct']);

        return response()->json(['message' => 'Permission accordée directement.']);
    }

    /**
     * POST /api/users/{user}/permissions/revoke
     * Revoke a direct permission from a user.
     */
    public function revokeDirect(Request $request, User $target): JsonResponse
    {
        $data = $request->validate([
            'permission' => 'required|string|exists:permissions,name',
        ]);

        $target->revokePermissionTo($data['permission']);
        $this->safeAudit('user', $target->id, 'revoked', $data['permission'], ['type' => 'direct']);

        return response()->json(['message' => 'Permission révoquée.']);
    }

    /**
     * GET /api/me/permissions?project_id=X
     * Endpoint consumed by the React frontend to get the current user's permissions.
     */
    public function myPermissions(Request $request): JsonResponse
    {
        $user      = $request->user();
        $projectId = $request->integer('project_id', 0) ?: null;

        $perms = $this->resolver->resolvePermissions($user, $projectId);

        return response()->json([
            'permissions' => $perms,
            'roles'       => $user->getRoleNames()->values(),
            'project_id'  => $projectId,
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    private function safeAudit(string $type, int $id, string $action, ?string $perm, ?array $ctx = null): void
    {
        try {
            PermissionAuditLog::record($type, $id, $action, $perm, $ctx);
        } catch (\Throwable) {}
    }

    private function formatPermission(Permission $p): array
    {
        return [
            'id'          => $p->id,
            'name'        => $p->name,
            'slug'        => $p->slug ?? $p->name,
            'module'      => $p->module,
            'action'      => $p->action,
            'scope'       => $p->scope,
            'description' => $p->description,
            'is_system'   => (bool) ($p->is_system ?? true),
        ];
    }
}
