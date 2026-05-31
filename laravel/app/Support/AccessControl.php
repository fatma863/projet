<?php

namespace App\Support;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class AccessControl
{
    /**
     * Cache en mémoire valable le temps d'une requête HTTP.
     * Clé : "{user_id}:{project_id}" → rôle normalisé ou null
     *
     * @var array<string, string|null>
     */
    private static array $projectRoleCache = [];

    /** Vide le cache (utile dans les tests). */
    public static function flushCache(): void
    {
        self::$projectRoleCache = [];
    }

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

    /**
     * Returns true if the user has the 'client' role (read-only viewer).
     * Works with both the canonical 'client' role and any role explicitly
     * named 'client' in a dynamic RBAC setup.
     */
    public static function isClientRole(User $user): bool
    {
        return $user->hasRole('client');
    }

    public static function projectRole(User $user, Project $project): ?string
    {
        $cacheKey = $user->id . ':' . $project->id;
        if (array_key_exists($cacheKey, self::$projectRoleCache)) {
            return self::$projectRoleCache[$cacheKey];
        }

        $pivotRole = null;
        if (Schema::hasTable('project_user')) {
            $pivotRole = $project->users()
                ->where('users.id', $user->id)
                ->first()?->pivot?->role;
        }

        if ($pivotRole) {
            return self::$projectRoleCache[$cacheKey] = self::normalizePivotRole($pivotRole);
        }

        $legacyRole = $project->members()
            ->where('users.id', $user->id)
            ->first()?->pivot?->project_role;

        if (! $legacyRole) {
            return self::$projectRoleCache[$cacheKey] = null;
        }

        $resolved = match (true) {
            in_array($legacyRole, ['owner', 'manager'], true) => 'admin',
            in_array($legacyRole, ['guest', 'client'], true) => 'client',
            in_array($legacyRole, ['admin', 'member', 'client'], true) => self::normalizePivotRole($legacyRole),
            default => 'member',
        };

        return self::$projectRoleCache[$cacheKey] = $resolved;
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

    /**
     * Seuls l'admin système et le chef de projet (owner ou chef_id) peuvent
     * ajouter un membre directement ou inviter un client.
     */
    public static function canManageProjectMembers(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }

        return false;
    }

    public static function canInviteToProject(User $user, Project $project): bool
    {
        if (self::isAdmin($user)) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
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

        if (self::isClientRole($user) && $projectRole === null && (int) $project->owner_id !== (int) $user->id) {
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

        if (! self::isClientRole($user)) {
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

        if (self::isClientRole($user)) {
            return false;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
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

        if (self::isClientRole($user)) {
            return false;
        }

        // Chef can always create tasks
        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        // Any project member (role = membre) can create tasks — no more client restriction
        if (Schema::hasTable('project_user') && $project->users()->where('users.id', $user->id)->exists()) {
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

        if (self::isClientRole($user)) {
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

        if (self::isClientRole($user)) {
            return false;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }

        // Legacy role check
        $projectRole = self::projectRole($user, $project);
        if ($projectRole === 'admin') {
            return true;
        }

        return (int) $task->created_by === (int) $user->id
            || $task->assignees()->where('users.id', $user->id)->exists();
    }

    public static function canDeleteTask(User $user, Task $task): bool
    {
        // Admin applicatif : toujours autorisé
        if (self::isAdmin($user)) {
            return true;
        }

        // Client : jamais autorisé
        if (self::isClientRole($user)) {
            return false;
        }

        $project = $task->project;

        // Chef du projet ou propriétaire : peut supprimer toute tâche de son projet
        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }
        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }

        // Rôle "admin" au niveau du projet (legacy)
        if (self::projectRole($user, $project) === 'admin') {
            return true;
        }

        // Membre : peut supprimer uniquement une tâche qu'il a créée
        // et dont le workflow n'est pas encore terminé (évite la suppression rétroactive)
        if ((int) $task->created_by === (int) $user->id) {
            $isCompleted = $task->workflow_status === 'done'
                || ($task->progress_percent ?? 0) >= 100;
            return ! $isCompleted;
        }

        return false;
    }
}
