<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class AccessControl
{
    /** Normalise les anciennes valeurs pivot (viewer/guest -> client). */
    public static function normalizePivotRole(?string $role): ?string
    {
        if ($role === null || $role === '') {
            return $role;
        }

        if (in_array($role, ['viewer', 'guest'], true)) {
            return 'client';
        }

        return $role;
    }

    public static function isAdmin(User $user): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        try {
            return $user->hasPermissionTo('manage-all-projects')
                || $user->hasPermissionTo('manage-users');
        } catch (\Throwable) {
            return false;
        }
    }

    public static function projectRole(User $user, Project $project): ?string
    {
        $pivotRole = null;
        if (Schema::hasTable('project_user')) {
            $pivotRole = $project->users()
                ->where('users.id', $user->id)
                ->first()?->pivot?->role;
        }

        if ($pivotRole) {
            return self::normalizePivotRole($pivotRole);
        }

        $legacyRole = $project->members()
            ->where('users.id', $user->id)
            ->first()?->pivot?->project_role;

        if (! $legacyRole) {
            return null;
        }

        return match (true) {
            in_array($legacyRole, ['owner', 'manager'], true) => 'admin',
            in_array($legacyRole, ['guest', 'client'], true) => 'client',
            in_array($legacyRole, ['admin', 'member', 'viewer'], true) => self::normalizePivotRole($legacyRole),
            default => 'member',
        };
    }

    /**
     * Alias explicite pour les contrôleurs / services métier.
     */
    public static function getUserProjectRole(User $user, Project $project): ?string
    {
        return self::projectRole($user, $project);
    }

    public static function isProjectClient(User $user, Project $project): bool
    {
        return self::projectRole($user, $project) === 'client';
    }

    public static function canInviteToProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        return self::projectRole($user, $project) === 'admin';
    }

    public static function canViewProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        $projectRole = self::projectRole($user, $project);

        if ($user->hasRole('viewer') && $projectRole === null && (int) $project->owner_id !== (int) $user->id) {
            return false;
        }

        if ($projectRole !== null) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        if ($project->members()->where('users.id', $user->id)->exists()) {
            return true;
        }

        if (! $user->hasRole('viewer')) {
            return $project->tasks()
                ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
                ->exists();
        }

        return false;
    }

    public static function canEditProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ($user->hasRole('viewer')) {
            return false;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        return self::projectRole($user, $project) === 'admin';
    }

    /**
     * Création de tâches, déplacement Kanban, pièces jointes (hors commentaire).
     */
    public static function canCreateTaskInProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ($user->hasRole('viewer')) {
            return false;
        }

        $role = self::projectRole($user, $project);
        if ($role === 'client') {
            return false;
        }

        if (in_array($role, ['admin', 'member'], true)) {
            return true;
        }

        if ($project->members()->where('users.id', $user->id)->exists()) {
            return true;
        }

        return $project->tasks()
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $user->id))
            ->exists();
    }

    public static function canCommentOnProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ($user->hasRole('viewer')) {
            return false;
        }

        if (self::isProjectClient($user, $project)) {
            return false;
        }

        return self::canCreateTaskInProject($user, $project);
    }

    public static function canEditTask(User $user, Task $task): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        $project = $task->project;
        $projectRole = self::projectRole($user, $project);

        if ($user->hasRole('viewer')) {
            return false;
        }

        if ($projectRole === 'client') {
            return false;
        }

        if ((int) $project->owner_id === (int) $user->id || $projectRole === 'admin') {
            return true;
        }

        return (int) $task->created_by === (int) $user->id
            || $task->assignees()->where('users.id', $user->id)->exists();
    }

    public static function canDeleteTask(User $user, Task $task): bool
    {
        return self::isAdmin($user);
    }
}
