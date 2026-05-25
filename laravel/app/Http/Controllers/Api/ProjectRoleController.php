<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PermissionAuditLog;
use App\Models\Project;
use App\Models\ProjectUserRole;
use App\Models\User;
use App\Services\PermissionResolver;
use App\Support\AccessControl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

/**
 * Manages project-scoped role overrides and per-project permission customization.
 */
class ProjectRoleController extends Controller
{
    public function __construct(private readonly PermissionResolver $resolver) {}

    /**
     * GET /api/projects/{project}/roles
     * List all members of a project with their role overrides.
     */
    public function index(Project $project): JsonResponse
    {
        $overrides = ProjectUserRole::where('project_id', $project->id)
            ->with(['user:id,name,email,avatar', 'role:id,name,color,icon'])
            ->get()
            ->map(fn (ProjectUserRole $o) => [
                'user'                => $o->user,
                'role'                => $o->role,
                'granted_permissions' => $o->granted_permissions ?? [],
                'denied_permissions'  => $o->denied_permissions ?? [],
                'assigned_by'         => $o->assigned_by,
                'updated_at'          => $o->updated_at,
            ]);

        return response()->json(['data' => $overrides]);
    }

    /**
     * PUT /api/projects/{project}/roles/{user}
     * Set or update the project-scoped role override for a specific user.
     */
    public function setUserRole(Request $request, Project $project, User $target): JsonResponse
    {
        $actor = $request->user();

        if (! AccessControl::canManageProjectMembers($actor, $project)) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        $data = $request->validate([
            'role_id'             => 'nullable|exists:roles,id',
            'granted_permissions' => 'nullable|array',
            'granted_permissions.*' => 'string|exists:permissions,name',
            'denied_permissions'  => 'nullable|array',
            'denied_permissions.*' => 'string|exists:permissions,name',
        ]);

        $override = ProjectUserRole::updateOrCreate(
            ['project_id' => $project->id, 'user_id' => $target->id],
            [
                'role_id'             => $data['role_id'] ?? null,
                'granted_permissions' => $data['granted_permissions'] ?? [],
                'denied_permissions'  => $data['denied_permissions'] ?? [],
                'assigned_by'         => $actor->id,
            ],
        );

        PermissionAuditLog::record('project_user', $target->id, 'project_role_set', null, [
            'project_id' => $project->id,
            'role_id'    => $data['role_id'] ?? null,
        ], $actor->id);

        $this->resolver->flushCache();

        return response()->json([
            'message' => 'Rôle projet mis à jour.',
            'data'    => $override->load(['role:id,name,color,icon', 'user:id,name,email']),
        ]);
    }

    /**
     * DELETE /api/projects/{project}/roles/{user}
     * Remove the project-scoped role override for a user (falls back to global role).
     */
    public function removeUserRole(Request $request, Project $project, User $target): JsonResponse
    {
        $actor = $request->user();

        if (! AccessControl::canManageProjectMembers($actor, $project)) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        ProjectUserRole::where('project_id', $project->id)
            ->where('user_id', $target->id)
            ->delete();

        PermissionAuditLog::record('project_user', $target->id, 'project_role_removed', null, [
            'project_id' => $project->id,
        ], $actor->id);

        $this->resolver->flushCache();

        return response()->json(['message' => 'Override rôle supprimé, rôle global restauré.']);
    }

    /**
     * GET /api/projects/{project}/roles/{user}/permissions
     * Resolve and return the effective permissions for a user in a project.
     */
    public function userEffectivePermissions(Project $project, User $target): JsonResponse
    {
        $perms = $this->resolver->resolvePermissions($target, $project->id);

        return response()->json([
            'user_id'     => $target->id,
            'project_id'  => $project->id,
            'permissions' => $perms,
        ]);
    }

    /**
     * POST /api/projects/{project}/roles/{user}/grant
     * Add a permission to a user's granted_permissions for this project.
     */
    public function grantPermission(Request $request, Project $project, User $target): JsonResponse
    {
        $actor = $request->user();

        if (! AccessControl::canManageProjectMembers($actor, $project)) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        $data = $request->validate([
            'permission' => 'required|string|exists:permissions,name',
        ]);

        $override = ProjectUserRole::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $target->id],
            ['assigned_by' => $actor->id],
        );

        $granted = $override->granted_permissions ?? [];
        if (! in_array($data['permission'], $granted, true)) {
            $granted[] = $data['permission'];
            $override->update(['granted_permissions' => $granted]);
        }

        // Remove from denied if it was there
        $denied = array_values(array_diff($override->denied_permissions ?? [], [$data['permission']]));
        $override->update(['denied_permissions' => $denied]);

        PermissionAuditLog::record('project_user', $target->id, 'granted', $data['permission'], [
            'project_id' => $project->id,
            'type'       => 'project_scoped',
        ], $actor->id);

        $this->resolver->flushCache();

        return response()->json(['message' => 'Permission accordée pour ce projet.']);
    }

    /**
     * POST /api/projects/{project}/roles/{user}/deny
     * Add a permission to a user's denied_permissions for this project.
     */
    public function denyPermission(Request $request, Project $project, User $target): JsonResponse
    {
        $actor = $request->user();

        if (! AccessControl::canManageProjectMembers($actor, $project)) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        $data = $request->validate([
            'permission' => 'required|string|exists:permissions,name',
        ]);

        $override = ProjectUserRole::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $target->id],
            ['assigned_by' => $actor->id],
        );

        $denied = $override->denied_permissions ?? [];
        if (! in_array($data['permission'], $denied, true)) {
            $denied[] = $data['permission'];
            $override->update(['denied_permissions' => $denied]);
        }

        // Remove from granted if it was there
        $granted = array_values(array_diff($override->granted_permissions ?? [], [$data['permission']]));
        $override->update(['granted_permissions' => $granted]);

        PermissionAuditLog::record('project_user', $target->id, 'revoked', $data['permission'], [
            'project_id' => $project->id,
            'type'       => 'project_scoped_denied',
        ], $actor->id);

        $this->resolver->flushCache();

        return response()->json(['message' => 'Permission refusée pour ce projet.']);
    }
}
