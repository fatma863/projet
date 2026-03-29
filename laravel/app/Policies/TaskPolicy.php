<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Support\AccessControl;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        if (AccessControl::isAdmin($user)) {
            return true;
        }

        $projectRole = AccessControl::projectRole($user, $task->project);
        if ($projectRole !== null) {
            return true;
        }

        return $task->assignees()->where('users.id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        if ($user->hasRole('viewer')) {
            return false;
        }

        return $user->hasRole('admin') || $user->hasRole('member');
    }

    public function update(User $user, Task $task): bool
    {
        return AccessControl::canEditTask($user, $task);
    }

    public function delete(User $user, Task $task): bool
    {
        return AccessControl::canDeleteTask($user, $task);
    }
}
