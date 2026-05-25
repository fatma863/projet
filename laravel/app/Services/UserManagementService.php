<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserManagementService
{
    public function paginateUsers(
        string $search   = '',
        ?string $status  = null,
        ?string $role    = null,
        int $perPage     = 25,
    ): LengthAwarePaginator {
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

        // Filter by role (dynamic — any Spatie role name)
        if ($role !== null && $role !== '') {
            $query->role($role);
        }

        return $query->orderBy('name')->paginate($perPage);
    }

    /**
     * @param  array{name:string,email:string,password:string,password_confirmation?:string,status?:string,role?:string}  $data
     */
    public function createUser(array $data): User
    {
        $roleName = $data['role'] ?? 'member';

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'status'   => $data['status'] ?? 'active',
        ]);
        $user->syncRoles([$roleName]);

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
            $this->assertCanChangeAppRole($actor, $user->fresh(), $data['role']);
            $user->syncRoles([$data['role']]);
        }

        return $user->fresh();
    }

    private function assertCanChangeAppRole(User $actor, User $target, string $newRole): void
    {
        // Prevent self-demotion from admin
        if ((int) $actor->id === (int) $target->id && $target->hasRole('admin') && $newRole !== 'admin') {
            throw ValidationException::withMessages([
                'role' => ['Vous ne pouvez pas retirer votre propre rôle administrateur.'],
            ]);
        }

        // Prevent removing the last active admin
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

