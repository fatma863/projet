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
}
