<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Team extends Model
{
    protected $fillable = ['name', 'description', 'team_leader_id'];

    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_user')
            ->withPivot('role_in_team', 'capacity_hours_per_week', 'skills', 'is_active')
            ->withTimestamps();
    }

    public function activeMembers(): BelongsToMany
    {
        return $this->members()->wherePivot('is_active', true);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Rôle projet agrégé (permissions) depuis project_user pour les projets de cette équipe.
        * Admin > membre > client (legacy guest / viewer).
     */
    public static function strongestProjectRoleFromRoles(Collection|array $roles): ?string
    {
        $list = collect($roles)->filter()->values();
        if ($list->isEmpty()) {
            return null;
        }

          $rank = ['admin' => 3, 'member' => 2, 'client' => 1, 'guest' => 1, 'viewer' => 1];
        $best = $list->sortByDesc(fn ($r) => $rank[$r] ?? 0)->first();

          return in_array($best, ['viewer', 'guest'], true) ? 'client' : $best;
    }

    /**
      * Normalise une valeur role de la table project_user (admin|member|client + legacy guest/viewer).
     */
    public static function normalizeProjectUserPivotRole(?string $role): ?string
    {
        if ($role === null || $role === '') {
            return null;
        }

        return match ($role) {
            'viewer', 'guest' => 'client',
            default => $role,
        };
    }

    /**
     * Normalise project_members.project_role vers le même vocabulaire que project_user (admin|member|client).
     */
    public static function normalizeProjectMemberPivotRole(?string $role): ?string
    {
        if ($role === null || $role === '') {
            return null;
        }

        return match (strtolower($role)) {
            'owner', 'admin' => 'admin',
            'client', 'guest', 'viewer' => 'client',
            'member', 'developer' => 'member',
            default => 'member',
        };
    }

    /**
     * Définit project_access_role sur chaque membre chargé (pivot team_user).
     * Agrège project_user et project_members pour les projets de cette équipe.
     */
    public function enrichMembersWithProjectRoles(): void
    {
        $this->loadMissing('members');
        $projectIds = $this->projects()->pluck('id');
        if ($projectIds->isEmpty()) {
            foreach ($this->members as $m) {
                $m->setAttribute('project_access_role', null);
            }

            return;
        }

        $userIds = $this->members->pluck('id');

        $puRows = DB::table('project_user')
            ->whereIn('project_id', $projectIds)
            ->whereIn('user_id', $userIds)
            ->get();

        $pmRows = DB::table('project_members')
            ->whereIn('project_id', $projectIds)
            ->whereIn('user_id', $userIds)
            ->get();

        $byUser = [];
        foreach ($userIds as $uid) {
            $roles = collect();
            foreach ($puRows->where('user_id', $uid) as $row) {
                $roles->push(self::normalizeProjectUserPivotRole($row->role ?? null));
            }
            foreach ($pmRows->where('user_id', $uid) as $row) {
                $roles->push(self::normalizeProjectMemberPivotRole($row->project_role ?? null));
            }
            $byUser[$uid] = self::strongestProjectRoleFromRoles($roles->filter());
        }

        foreach ($this->members as $m) {
            $m->setAttribute('project_access_role', $byUser[$m->id] ?? null);
        }
    }
}
