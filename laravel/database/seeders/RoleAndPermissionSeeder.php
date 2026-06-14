<?php

namespace Database\Seeders;

use App\Models\PermissionGroup;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ─── Permission groups ───────────────────────────────────────────────
        $groups = [
            ['slug' => 'projects',      'name' => 'Projets',       'icon' => 'FolderKanban', 'color' => '#6366f1', 'order' => 1],
            ['slug' => 'tasks',         'name' => 'Tâches',        'icon' => 'ListTodo',     'color' => '#8b5cf6', 'order' => 2],
            ['slug' => 'sprints',       'name' => 'Sprints',       'icon' => 'Zap',          'color' => '#06b6d4', 'order' => 3],
            ['slug' => 'teams',         'name' => 'Équipes',       'icon' => 'Users',        'color' => '#f59e0b', 'order' => 4],
            ['slug' => 'users',         'name' => 'Utilisateurs',  'icon' => 'UserCog',      'color' => '#ec4899', 'order' => 5],
            ['slug' => 'ai',            'name' => 'Intelligence Artificielle', 'icon' => 'Brain', 'color' => '#14b8a6', 'order' => 6],
            ['slug' => 'dashboard',     'name' => 'Dashboard',     'icon' => 'LayoutDashboard', 'color' => '#f97316', 'order' => 7],
            ['slug' => 'gantt',         'name' => 'Gantt',         'icon' => 'CalendarRange', 'color' => '#84cc16', 'order' => 8],
            ['slug' => 'notifications', 'name' => 'Notifications', 'icon' => 'Bell',         'color' => '#64748b', 'order' => 9],
            ['slug' => 'roles',         'name' => 'Rôles & Permissions', 'icon' => 'ShieldCheck', 'color' => '#ef4444', 'order' => 10],
        ];

        $groupMap = [];
        foreach ($groups as $groupData) {
            $group = PermissionGroup::firstOrCreate(
                ['slug' => $groupData['slug']],
                $groupData,
            );
            $groupMap[$groupData['slug']] = $group->id;
        }

        // ─── Permission definitions ──────────────────────────────────────────
        // Format: [slug, module, action, scope, description, group_slug, is_system]
        $permissions = [
            // Projects
            ['project.view',           'projects', 'view',           'global',  'Voir les projets',                          'projects', true],
            ['project.create',         'projects', 'create',         'global',  'Créer un projet',                           'projects', true],
            ['project.edit',           'projects', 'edit',           'project', 'Modifier un projet',                        'projects', true],
            ['project.delete',         'projects', 'delete',         'global',  'Supprimer un projet',                       'projects', true],
            ['project.archive',        'projects', 'archive',        'project', 'Archiver un projet',                        'projects', true],
            ['project.export',         'projects', 'export',         'project', 'Exporter les données d\'un projet',         'projects', true],
            ['project.manage_members', 'projects', 'manage_members', 'project', 'Gérer les membres d\'un projet',            'projects', true],
            ['project.manage_settings','projects', 'manage_settings','project', 'Modifier les paramètres d\'un projet',      'projects', true],
            ['project.pause',          'projects', 'pause',          'project', 'Mettre un projet en pause (lecture seule)', 'projects', true],
            ['project.resume',         'projects', 'resume',         'project', 'Reprendre un projet en pause',             'projects', true],

            // Tasks
            ['task.view',              'tasks', 'view',              'project', 'Voir les tâches',                           'tasks', true],
            ['task.create',            'tasks', 'create',            'project', 'Créer une tâche',                           'tasks', true],
            ['task.edit',              'tasks', 'edit',              'project', 'Modifier une tâche',                        'tasks', true],
            ['task.delete',            'tasks', 'delete',            'project', 'Supprimer une tâche',                       'tasks', true],
            ['task.assign',            'tasks', 'assign',            'project', 'Assigner une tâche à un utilisateur',       'tasks', true],
            ['task.comment',           'tasks', 'comment',           'project', 'Commenter sur une tâche',                   'tasks', true],
            ['task.change_status',     'tasks', 'change_status',     'project', 'Changer le statut d\'une tâche',            'tasks', true],
            ['task.manage_dependencies','tasks','manage_dependencies','project', 'Gérer les dépendances de tâches',           'tasks', true],
            ['task.manage_time',       'tasks', 'manage_time',       'project', 'Gérer les entrées de temps',                'tasks', true],
            ['task.export',            'tasks', 'export',            'project', 'Exporter les tâches',                       'tasks', true],

            // Sprints
            ['sprint.view',     'sprints', 'view',     'project', 'Voir les sprints',            'sprints', true],
            ['sprint.create',   'sprints', 'create',   'project', 'Créer un sprint',             'sprints', true],
            ['sprint.edit',     'sprints', 'edit',     'project', 'Modifier un sprint',          'sprints', true],
            ['sprint.delete',   'sprints', 'delete',   'project', 'Supprimer un sprint',         'sprints', true],
            ['sprint.complete', 'sprints', 'complete', 'project', 'Marquer un sprint comme terminé', 'sprints', true],

            // Teams
            ['team.view',           'teams', 'view',           'global', 'Voir les équipes',                       'teams', true],
            ['team.create',         'teams', 'create',         'global', 'Créer une équipe',                       'teams', true],
            ['team.edit',           'teams', 'edit',           'global', 'Modifier une équipe',                    'teams', true],
            ['team.delete',         'teams', 'delete',         'global', 'Supprimer une équipe',                   'teams', true],
            ['team.manage_members', 'teams', 'manage_members', 'global', 'Gérer les membres d\'une équipe',        'teams', true],

            // Users
            ['user.view',               'users', 'view',               'global', 'Voir les utilisateurs',                 'users', true],
            ['user.create',             'users', 'create',             'global', 'Créer un utilisateur',                  'users', true],
            ['user.edit',               'users', 'edit',               'global', 'Modifier un utilisateur',               'users', true],
            ['user.delete',             'users', 'delete',             'global', 'Supprimer un utilisateur',              'users', true],
            ['user.assign_role',        'users', 'assign_role',        'global', 'Assigner un rôle à un utilisateur',     'users', true],
            ['user.suspend',            'users', 'suspend',            'global', 'Suspendre / réactiver un compte',       'users', true],
            ['user.manage_permissions', 'users', 'manage_permissions', 'global', 'Gérer les permissions directes',        'users', true],

            // AI
            ['ai.view',      'ai', 'view',      'global', 'Voir les fonctionnalités IA',             'ai', true],
            ['ai.use',       'ai', 'use',        'global', 'Utiliser les fonctionnalités IA',         'ai', true],
            ['ai.retrain',   'ai', 'retrain',    'global', 'Réentraîner le modèle ML',                'ai', true],
            ['ai.analytics', 'ai', 'analytics',  'global', 'Voir les analytics IA',                   'ai', true],

            // Dashboard
            ['dashboard.view_admin',     'dashboard', 'view_admin',     'global', 'Accéder au dashboard administrateur', 'dashboard', true],
            ['dashboard.view_member',    'dashboard', 'view_member',    'global', 'Accéder au dashboard membre',         'dashboard', true],
            ['dashboard.view_client',    'dashboard', 'view_client',    'global', 'Accéder au dashboard client',         'dashboard', true],
            ['dashboard.view_analytics', 'dashboard', 'view_analytics', 'global', 'Voir les analytics globaux',          'dashboard', true],

            // Gantt
            ['gantt.view', 'gantt', 'view', 'project', 'Voir le diagramme de Gantt', 'gantt', true],
            ['gantt.edit', 'gantt', 'edit', 'project', 'Modifier le diagramme de Gantt', 'gantt', true],

            // Notifications
            ['notification.view',   'notifications', 'view',   'global', 'Voir les notifications',            'notifications', true],
            ['notification.manage', 'notifications', 'manage', 'global', 'Gérer les préférences de notifications', 'notifications', true],

            // Roles & Permissions
            ['role.view',   'roles', 'view',   'global', 'Voir les rôles et permissions', 'roles', true],
            ['role.create', 'roles', 'create', 'global', 'Créer un rôle',                 'roles', true],
            ['role.edit',   'roles', 'edit',   'global', 'Modifier un rôle',              'roles', true],
            ['role.delete', 'roles', 'delete', 'global', 'Supprimer un rôle',             'roles', true],
            ['role.assign', 'roles', 'assign', 'global', 'Assigner un rôle',              'roles', true],
        ];

        foreach ($permissions as [$slug, $module, $action, $scope, $description, $groupSlug, $isSystem]) {
            Permission::withoutEvents(function () use ($slug, $module, $action, $scope, $description, $groupSlug, $groupMap, $isSystem) {
                $perm = Permission::firstOrCreate(
                    ['name' => $slug, 'guard_name' => 'web'],
                    [
                        'slug'        => $slug,
                        'module'      => $module,
                        'action'      => $action,
                        'scope'       => $scope,
                        'description' => $description,
                        'group_id'    => $groupMap[$groupSlug] ?? null,
                        'is_system'   => $isSystem,
                    ],
                );

                // Update metadata on existing perms in case seeder is re-run
                $perm->update([
                    'slug'        => $slug,
                    'module'      => $module,
                    'action'      => $action,
                    'scope'       => $scope,
                    'description' => $description,
                    'group_id'    => $groupMap[$groupSlug] ?? null,
                    'is_system'   => $isSystem,
                ]);
            });
        }

        // ─── Rôles système ──────────────────────────────────────────────────
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->fill(['description' => 'Administrateur — accès complet à la plateforme', 'color' => '#6366f1'])->save();
        $admin->syncPermissions(Permission::all());

        $member = Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        $member->fill(['description' => 'Collaborateur — utilisateur standard inscrit aux projets', 'color' => '#10b981'])->save();
        $member->syncPermissions([
            // project.pause and project.resume are intentionally NOT included for members
            'project.view', 'project.create', 'project.edit', 'project.archive',
            'project.export', 'project.manage_members', 'project.manage_settings',

            'task.view', 'task.create', 'task.edit', 'task.assign', 'task.comment',
            'task.change_status', 'task.manage_dependencies', 'task.manage_time', 'task.export',

            'sprint.view', 'sprint.create', 'sprint.edit', 'sprint.complete',

            'team.view',

            'user.view',

            'ai.view', 'ai.use', 'ai.analytics',

            'dashboard.view_member', 'dashboard.view_analytics',

            'gantt.view', 'gantt.edit',

            'notification.view', 'notification.manage',
        ]);

        $client = Role::firstOrCreate(['name' => 'client', 'guard_name' => 'web']);
        $client->fill(['description' => 'Observateur — accès en lecture seule aux projets invités', 'color' => '#f59e0b'])->save();
        $client->syncPermissions([
            'project.view',
            'project.export',

            'task.view',

            'sprint.view',

            'ai.view',

            'dashboard.view_client',

            'gantt.view',

            'notification.view',
        ]);

        // Mark canonical roles as system roles
        \DB::table('roles')
            ->whereIn('name', ['admin', 'member', 'client'])
            ->update(['is_system' => true]);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
