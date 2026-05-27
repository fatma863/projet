<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Support\AccessControl;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        return AccessControl::canViewProject($user, $project);
    }

    public function create(User $user): bool
    {
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        try {
            return $user->hasPermissionTo('manage-projects') || $user->hasPermissionTo('manage-all-projects');
        } catch (\Throwable) {
            return false;
        }
    }

    public function update(User $user, Project $project): bool
    {
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        try {
            if ($user->hasPermissionTo('manage-all-projects')) {
                return true;
            }
        } catch (\Throwable) {
            // continue
        }

        // Propriétaire / rôle projet admin (hors compte admin global)
        return AccessControl::canEditProject($user, $project);
    }

    public function delete(User $user, Project $project): bool
    {
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        try {
            return $user->hasPermissionTo('manage-all-projects');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Who can pause a project:
     * ✅ Application admin
     * ✅ Project owner / chef (project-level manager)
     * ✅ Any user with the explicit `project.pause` Spatie permission
     * ❌ Regular members / clients
     */
    public function pause(User $user, Project $project): bool
    {
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        // Project cannot be paused if already locked or finished.
        if (in_array($project->status, ['on_hold', 'completed', 'cancelled'], true)) {
            return false;
        }

        // Project-level leads (owner / chef / manager)
        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }
        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }
        if ($project->project_manager_id && (int) $project->project_manager_id === (int) $user->id) {
            return true;
        }

        try {
            return $user->hasPermissionTo('project.pause');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Who can resume a project:
     * Same rules as `pause` — but the project must currently be on_hold.
     */
    public function resume(User $user, Project $project): bool
    {
        if ($project->status !== 'on_hold') {
            return false;
        }

        if (AccessControl::isAdmin($user)) {
            return true;
        }

        if ((int) $project->owner_id === (int) $user->id) {
            return true;
        }
        if ($project->chef_id && (int) $project->chef_id === (int) $user->id) {
            return true;
        }
        if ($project->project_manager_id && (int) $project->project_manager_id === (int) $user->id) {
            return true;
        }

        try {
            return $user->hasPermissionTo('project.resume');
        } catch (\Throwable) {
            return false;
        }
    }
}
