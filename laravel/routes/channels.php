<?php

use App\Models\Project;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return $user->id === $userId;
});

Broadcast::channel('project.{projectId}', function ($user, int $projectId) {
    // Clients must never receive real-time activity broadcasts — they expose
    // internal team events (task changes, member management, etc.).
    if ($user->hasRole('client')) {
        return false;
    }

    if ($user->hasRole('admin')) {
        return true;
    }

    return Project::query()
        ->where('id', $projectId)
        ->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id)
                ->orWhereHas('members', fn ($qm) => $qm->where('users.id', $user->id))
                ->orWhereHas('users', fn ($qu) => $qu->where('users.id', $user->id));
        })
        ->exists();
});
