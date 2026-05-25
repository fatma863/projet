<?php

namespace App\Http\Controllers\Api;

use App\Events\PermissionChanged;
use App\Http\Controllers\Controller;
use App\Models\PermissionAuditLog;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(private readonly RoleService $roleService) {}

    // GET /api/roles
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')
            ->orderBy('level', 'desc')
            ->get();

        // Count users per role via model_has_roles table (avoids Spatie morphedByMany null-model issue)
        $userCounts = \DB::table('model_has_roles')
            ->where('model_type', \App\Models\User::class)
            ->selectRaw('role_id, count(*) as total')
            ->groupBy('role_id')
            ->pluck('total', 'role_id');

        $data = $roles->map(fn (Role $r) => $this->formatRole($r, $userCounts->get($r->id, 0)));

        return response()->json(['data' => $data]);
    }

    // GET /api/roles/{role}
    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');

        $usersCount = \DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('model_type', \App\Models\User::class)
            ->count();

        return response()->json(['data' => $this->formatRole($role, $usersCount)]);
    }

    // POST /api/roles
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:60|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
            'level'       => 'nullable|integer|min:1|max:99',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = $this->roleService->create($data, $request->user());

        return response()->json(['data' => $this->formatRole($role, 0)], 201);
    }

    // PUT /api/roles/{role}
    public function update(Request $request, Role $role): JsonResponse
    {
        if ($role->is_system && $request->has('name')) {
            return response()->json(['message' => 'Le nom des rôles système ne peut pas être modifié.'], 422);
        }

        $data = $request->validate([
            'name'        => 'sometimes|string|max:60|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:255',
            'color'       => 'nullable|string|max:20',
            'icon'        => 'nullable|string|max:50',
            'level'       => 'nullable|integer|min:1|max:99',
        ]);

        $role = $this->roleService->update($role, $data, $request->user());

        $usersCount = \DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->where('model_type', \App\Models\User::class)
            ->count();

        return response()->json(['data' => $this->formatRole($role, $usersCount)]);
    }

    // PUT /api/roles/{role}/permissions
    public function syncPermissions(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'permissions'   => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = $this->roleService->syncPermissions($role, $data['permissions'], $request->user());
        $this->notifyRoleUsers($role, 'permission_granted', ['role' => $role->name]);

        return response()->json(['data' => $this->formatRole($role, 0)]);
    }

    // POST /api/roles/{role}/permissions/{permission}   → grant
    public function grantPermission(Request $request, Role $role, string $permission): JsonResponse
    {
        if (! Permission::where('name', $permission)->exists()) {
            return response()->json(['message' => 'Permission introuvable.'], 404);
        }

        $this->roleService->grantPermission($role, $permission, $request->user());
        $this->notifyRoleUsers($role, 'permission_granted', ['permission' => $permission]);

        return response()->json(['message' => 'Permission accordée.']);
    }

    // DELETE /api/roles/{role}/permissions/{permission}  → revoke
    public function revokePermission(Request $request, Role $role, string $permission): JsonResponse
    {
        $this->roleService->revokePermission($role, $permission, $request->user());
        $this->notifyRoleUsers($role, 'permission_revoked', ['permission' => $permission]);

        return response()->json(['message' => 'Permission révoquée.']);
    }

    // POST /api/roles/{role}/duplicate
    public function duplicate(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60|unique:roles,name',
        ]);

        $clone = $this->roleService->duplicate($role, $data['name'], $request->user());

        return response()->json(['data' => $this->formatRole($clone, 0)], 201);
    }

    // POST /api/roles/{role}/archive
    public function toggleArchive(Request $request, Role $role): JsonResponse
    {
        $role = $this->roleService->toggleArchive($role, $request->user());

        return response()->json([
            'message' => $role->is_archived ? 'Rôle archivé.' : 'Rôle désarchivé.',
            'data'    => $this->formatRole($role, 0),
        ]);
    }

    // DELETE /api/roles/{role}
    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($role->is_system) {
            return response()->json(['message' => 'Les rôles système ne peuvent pas être supprimés.'], 422);
        }

        $this->roleService->delete($role, $request->user());

        return response()->json(['message' => 'Rôle supprimé.']);
    }

    // GET /api/roles/{role}/users
    public function users(Role $role): JsonResponse
    {
        $users = User::role($role->name)
            ->select('id', 'name', 'email', 'avatar', 'status')
            ->paginate(20);

        return response()->json($users);
    }

    // POST /api/roles/{role}/users/{user}
    public function assignUser(Request $request, Role $role, User $target): JsonResponse
    {
        $this->roleService->assignToUser($target, $role->name, $request->user());
        event(new PermissionChanged($target, 'role_changed', ['role' => $role->name]));

        return response()->json(['message' => 'Rôle assigné à ' . $target->name . '.']);
    }

    // GET /api/roles/audit-log
    public function auditLog(Request $request): JsonResponse
    {
        $logs = PermissionAuditLog::with('performer:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }

    // ────────────────────────────────────────────────────────────────────────
    private function notifyRoleUsers(Role $role, string $changeType, array $details = []): void
    {
        User::role($role->name)->select('id')->each(function (User $user) use ($changeType, $details) {
            event(new PermissionChanged($user, $changeType, $details));
        });
    }

    private function formatRole(Role $role, int $usersCount = 0): array
    {
        return [
            'id'          => $role->id,
            'name'        => $role->name,
            'description' => $role->description ?? null,
            'color'       => $role->color ?? '#6366f1',
            'icon'        => $role->icon ?? 'Shield',
            'level'       => $role->level ?? 10,
            'is_system'   => (bool) ($role->is_system ?? false),
            'is_archived' => (bool) ($role->is_archived ?? false),
            'users_count' => $usersCount,
            'permissions' => ($role->relationLoaded('permissions') ? $role->permissions : collect())
                ->map(fn ($p) => [
                    'id'          => $p->id,
                    'name'        => $p->name,
                    'slug'        => $p->slug ?? $p->name,
                    'module'      => $p->module ?? null,
                    'action'      => $p->action ?? null,
                    'description' => $p->description ?? null,
                ])->values(),
        ];
    }
}
