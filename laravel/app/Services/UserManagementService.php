<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserManagementService
{
    /** @var list<string> */
    public const APP_ROLES = ['admin', 'member', 'viewer'];

    public function paginateUsers(string $search = '', ?string $status = null, int $perPage = 25): LengthAwarePaginator
    {
        $query = User::query()
            ->with('specialties')
            ->when($search !== '', fn ($q) => $q->where(function ($sub) use ($search): void {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }));

        // Compatibilité: anciens comptes sans status (NULL / '') sont considérés "active".
        if ($status === 'active') {
            $query->where(function ($q): void {
                $q->where('status', 'active')
                    ->orWhereNull('status')
                    ->orWhere('status', '');
            });
        } elseif ($status === 'disabled') {
            $query->where('status', 'disabled');
        }

        return $query->orderBy('name')->paginate($perPage);
    }

    /**
     * @param  array{name:string,email:string,password:string,password_confirmation?:string,status?:string,role?:string}  $data
     */
    public function createUser(array $data): User
    {
        $role = $this->normalizeAppRole($data['role'] ?? 'member');

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'status' => $data['status'] ?? 'active',
        ]);
        $user->syncRoles([$role]);

        return $user->fresh();
    }

    /**
     * @param  array{name?:string,email?:string,password?:string,password_confirmation?:string,status?:string,role?:string}  $data
     */
    public function updateUser(User $actor, User $user, array $data): User
    {
        $payload = [];
        if (array_key_exists('name', $data)) {
            $payload['name'] = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $payload['email'] = $data['email'];
        }
        if (array_key_exists('status', $data)) {
            $payload['status'] = $data['status'];
        }
        if (! empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        if (! empty($payload)) {
            $user->update($payload);
        }

        if (array_key_exists('role', $data)) {
            $role = $this->normalizeAppRole($data['role']);
            $this->assertCanChangeAppRole($actor, $user->fresh(), $role);
            $user->syncRoles([$role]);
        }

        return $user->fresh();
    }

    private function normalizeAppRole(?string $role): string
    {
        $r = $role ?? 'member';

        return in_array($r, self::APP_ROLES, true) ? $r : 'member';
    }

    private function assertCanChangeAppRole(User $actor, User $target, string $newRole): void
    {
        if (! in_array($newRole, self::APP_ROLES, true)) {
            throw ValidationException::withMessages([
                'role' => ['Rôle invalide.'],
            ]);
        }

        if ((int) $actor->id === (int) $target->id && $target->hasRole('admin') && $newRole !== 'admin') {
            throw ValidationException::withMessages([
                'role' => ['Vous ne pouvez pas retirer votre propre rôle administrateur.'],
            ]);
        }

        if ($target->hasRole('admin') && $newRole !== 'admin') {
            $activeAdmins = User::role('admin')
                ->where(function ($q): void {
                    $q->where('status', 'active')
                        ->orWhereNull('status')
                        ->orWhere('status', '');
                })
                ->count();

            if ($activeAdmins <= 1) {
                throw ValidationException::withMessages([
                    'role' => ['Impossible de retirer le dernier administrateur actif.'],
                ]);
            }
        }
    }

    public function permanentDeleteUser(User $actor, User $target): void
    {
        if ((int) $actor->id === (int) $target->id) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de supprimer votre propre compte.'],
            ]);
        }

        if ($target->hasRole('admin')) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de supprimer un administrateur.'],
            ]);
        }

        $ownsProjects = Project::query()->where('owner_id', $target->id)->exists();
        if ($ownsProjects) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de supprimer un utilisateur propriétaire de projet(s).'],
            ]);
        }

        $target->tokens()->delete();
        $target->delete();
    }

    public function disableUser(User $actor, User $target): void
    {
        if ((int) $actor->id === (int) $target->id) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de désactiver votre propre compte.'],
            ]);
        }

        if ($target->hasRole('admin') && User::role('admin')->where('status', 'active')->count() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de désactiver le dernier administrateur actif.'],
            ]);
        }

        $ownsProjects = Project::query()->where('owner_id', $target->id)->exists();
        if ($ownsProjects) {
            throw ValidationException::withMessages([
                'user' => ['Impossible de désactiver un utilisateur propriétaire de projet(s).'],
            ]);
        }

        $target->update(['status' => 'disabled']);
        $target->tokens()->delete();
    }
}

