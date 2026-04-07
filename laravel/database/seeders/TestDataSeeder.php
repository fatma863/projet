<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Données supplémentaires pour les tests : nouveaux utilisateurs, équipes et projets.
 * Idempotent (firstOrCreate). Mot de passe pour tous les comptes de test : password
 */
class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@gestion-projets.local')->first();
        if (! $admin) {
            $this->command?->warn('TestDataSeeder : exécutez d\'abord DemoDataSeeder (admin manquant).');

            return;
        }

        $u1 = User::firstOrCreate(
            ['email' => 'leila.test@gestion-projets.local'],
            [
                'name' => 'Leïla Mansouri',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $u1->assignRole('member');

        $u2 = User::firstOrCreate(
            ['email' => 'karim.test@gestion-projets.local'],
            [
                'name' => 'Karim Jlassi',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $u2->assignRole('member');

        $u3 = User::firstOrCreate(
            ['email' => 'observer.test@gestion-projets.local'],
            [
                'name' => 'Sonia Observateur',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $u3->assignRole('viewer');

        $teamMobile = Team::firstOrCreate(
            ['name' => 'Équipe Mobile (test)'],
            [
                'description' => 'Équipe dédiée aux applications mobiles (données de test).',
                'team_leader_id' => $u1->id,
            ]
        );

        $teamQa = Team::firstOrCreate(
            ['name' => 'Équipe QA (test)'],
            [
                'description' => 'Tests manuels et automatisés (données de test).',
                'team_leader_id' => $u2->id,
            ]
        );

        $teamMobile->members()->syncWithoutDetaching([
            $admin->id => ['role_in_team' => 'lead', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['Mobile', 'React Native'])],
            $u1->id => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['Swift', 'Kotlin'])],
            $u2->id => ['role_in_team' => 'member', 'capacity_hours_per_week' => 35, 'skills' => json_encode(['Tests', 'CI'])],
        ]);

        $teamQa->members()->syncWithoutDetaching([
            $admin->id => ['role_in_team' => 'lead', 'capacity_hours_per_week' => 20, 'skills' => json_encode(['QA', 'Process'])],
            $u2->id => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['Playwright', 'PHPUnit'])],
            $u3->id => ['role_in_team' => 'member', 'capacity_hours_per_week' => 30, 'skills' => json_encode(['Tests manuels'])],
        ]);

        $projectMobile = Project::firstOrCreate(
            ['code' => 'MOBAPP'],
            [
                'team_id' => $teamMobile->id,
                'name' => 'App mobile commerce (test)',
                'description' => 'Prototype e-commerce iOS/Android pour scénarios de test.',
                'status' => 'active',
                'start_date' => '2026-03-01',
                'end_date' => '2026-09-30',
                'owner_id' => $admin->id,
                'created_by' => $admin->id,
            ]
        );

        $projectMobile->members()->syncWithoutDetaching([
            $admin->id => ['project_role' => 'admin'],
            $u1->id => ['project_role' => 'member'],
            $u2->id => ['project_role' => 'member'],
            $u3->id => ['project_role' => 'client'],
        ]);

        $stTodo = TaskStatus::firstOrCreate(
            ['project_id' => $projectMobile->id, 'name' => 'À faire'],
            ['color' => '#6B7280', 'order' => 0, 'is_default' => true]
        );
        $stDoing = TaskStatus::firstOrCreate(
            ['project_id' => $projectMobile->id, 'name' => 'En cours'],
            ['color' => '#3B82F6', 'order' => 1]
        );
        $stDone = TaskStatus::firstOrCreate(
            ['project_id' => $projectMobile->id, 'name' => 'Terminé'],
            ['color' => '#10B981', 'order' => 2]
        );

        $mobileTasks = [
            [
                'title' => 'Écran panier (test)',
                'description' => 'UI panier + appels API panier.',
                'status_id' => $stDoing->id,
                'priority' => 'high',
                'complexity' => 3,
                'planned_start' => '2026-03-10',
                'planned_end' => '2026-03-28',
                'due_date' => '2026-03-28',
                'estimated_hours' => 12,
                'progress_percent' => 35,
                'created_by' => $u1->id,
                'assignees' => [$u1->id],
            ],
            [
                'title' => 'Push notifications (test)',
                'description' => 'Configurer FCM / APNs pour les alertes commande.',
                'status_id' => $stTodo->id,
                'priority' => 'medium',
                'complexity' => 4,
                'planned_start' => '2026-04-01',
                'planned_end' => '2026-04-20',
                'due_date' => '2026-04-20',
                'estimated_hours' => 16,
                'progress_percent' => 0,
                'created_by' => $admin->id,
                'assignees' => [$u2->id],
            ],
            [
                'title' => 'Build CI mobile (test)',
                'description' => 'Pipeline build sur branches develop.',
                'status_id' => $stDone->id,
                'priority' => 'low',
                'complexity' => 2,
                'planned_start' => '2026-03-01',
                'planned_end' => '2026-03-08',
                'due_date' => '2026-03-08',
                'estimated_hours' => 8,
                'actual_hours' => 7,
                'progress_percent' => 100,
                'created_by' => $u2->id,
                'assignees' => [$u2->id],
            ],
        ];

        foreach ($mobileTasks as $index => $taskData) {
            $assignees = $taskData['assignees'] ?? [];
            unset($taskData['assignees']);

            $task = Task::firstOrCreate(
                ['project_id' => $projectMobile->id, 'title' => $taskData['title']],
                array_merge($taskData, [
                    'project_id' => $projectMobile->id,
                    'kanban_order' => $index,
                ])
            );

            foreach ($assignees as $userId) {
                $task->assignees()->syncWithoutDetaching([$userId => ['allocation_percent' => 100]]);
            }
        }

        $projectQa = Project::firstOrCreate(
            ['code' => 'QACAMP'],
            [
                'team_id' => $teamQa->id,
                'name' => 'Campagne QA automatisée (test)',
                'description' => 'Suites E2E et rapports de non-régression.',
                'status' => 'planning',
                'start_date' => '2026-04-01',
                'end_date' => '2026-07-31',
                'owner_id' => $u2->id,
                'created_by' => $u2->id,
            ]
        );

        $projectQa->members()->syncWithoutDetaching([
            $admin->id => ['project_role' => 'admin'],
            $u2->id => ['project_role' => 'member'],
            $u3->id => ['project_role' => 'member'],
        ]);

        $qTodo = TaskStatus::firstOrCreate(
            ['project_id' => $projectQa->id, 'name' => 'À faire'],
            ['color' => '#6B7280', 'order' => 0, 'is_default' => true]
        );
        $qDoing = TaskStatus::firstOrCreate(
            ['project_id' => $projectQa->id, 'name' => 'En cours'],
            ['color' => '#3B82F6', 'order' => 1]
        );

        $qaTasks = [
            [
                'title' => 'Scénarios checkout (test)',
                'description' => 'Couvrir paiement et annulation.',
                'status_id' => $qTodo->id,
                'priority' => 'high',
                'complexity' => 3,
                'planned_start' => '2026-04-05',
                'planned_end' => '2026-04-18',
                'due_date' => '2026-04-18',
                'estimated_hours' => 20,
                'progress_percent' => 0,
                'created_by' => $u2->id,
                'assignees' => [$u3->id],
            ],
            [
                'title' => 'Rapport couverture (test)',
                'description' => 'Dashboard couverture par module.',
                'status_id' => $qDoing->id,
                'priority' => 'medium',
                'complexity' => 2,
                'planned_start' => '2026-04-10',
                'planned_end' => '2026-04-25',
                'due_date' => '2026-04-25',
                'estimated_hours' => 10,
                'progress_percent' => 20,
                'created_by' => $u2->id,
                'assignees' => [$u2->id],
            ],
        ];

        foreach ($qaTasks as $index => $taskData) {
            $assignees = $taskData['assignees'] ?? [];
            unset($taskData['assignees']);

            $task = Task::firstOrCreate(
                ['project_id' => $projectQa->id, 'title' => $taskData['title']],
                array_merge($taskData, [
                    'project_id' => $projectQa->id,
                    'kanban_order' => $index,
                ])
            );

            foreach ($assignees as $userId) {
                $task->assignees()->syncWithoutDetaching([$userId => ['allocation_percent' => 100]]);
            }
        }

        $this->command?->info('TestDataSeeder : utilisateurs, équipes et projets de test créés ou mis à jour.');
    }
}
