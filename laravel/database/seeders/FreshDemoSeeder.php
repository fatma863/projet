<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Specialty;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FreshDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('🧹 Suppression des données existantes…');
        $this->purge();

        $this->command?->info('👤 Création des utilisateurs…');
        [$admin, $manager, $dev1, $dev2, $dev3, $leila, $karim, $sonia] = $this->seedUsers();

        $this->command?->info('🎯 Association des spécialités aux utilisateurs…');
        $this->assignSpecialties($admin, $manager, $dev1, $dev2, $dev3, $leila, $karim, $sonia);

        $this->command?->info('🏢 Création des équipes…');
        [$teamDev, $teamMobile, $teamData] = $this->seedTeams($admin, $manager, $dev1, $dev2, $dev3, $leila, $karim, $sonia);

        $this->command?->info('📁 Création des projets et tâches…');
        $this->seedProject1($teamDev, $admin, $manager, $dev1, $dev2, $dev3);
        $this->seedProject2($teamMobile, $admin, $leila, $dev2, $karim, $sonia);
        $this->seedProject3($teamData, $admin, $karim, $dev3, $manager);

        $this->command?->info('✅ FreshDemoSeeder terminé avec succès.');
    }

    // ─────────────────────────────────────────────────────────────
    // PURGE
    // ─────────────────────────────────────────────────────────────

    private function purge(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('task_specialty')->truncate();
        DB::table('user_specialty')->truncate();
        DB::table('time_entries')->truncate();
        DB::table('attachments')->truncate();
        DB::table('task_comments')->truncate();
        DB::table('task_dependencies')->truncate();
        DB::table('task_assignments')->truncate();
        DB::table('tasks')->truncate();
        DB::table('task_statuses')->truncate();
        DB::table('sprints')->truncate();
        DB::table('project_invitations')->truncate();
        DB::table('project_members')->truncate();
        DB::table('project_user')->truncate();
        DB::table('projects')->truncate();
        DB::table('team_user')->truncate();
        DB::table('teams')->truncate();
        DB::table('notifications')->truncate();
        DB::table('activity_logs')->truncate();
        DB::table('activities')->truncate();
        DB::table('ai_recommendations')->truncate();
        // Supprime tous les utilisateurs sauf on recrée juste après
        DB::table('personal_access_tokens')->truncate();
        DB::table('users')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    // ─────────────────────────────────────────────────────────────
    // UTILISATEURS
    // ─────────────────────────────────────────────────────────────

    private function seedUsers(): array
    {
        $admin = User::create([
            'name' => 'Fatma Rejeb',
            'email' => 'admin@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $admin->assignRole('admin');

        $manager = User::create([
            'name' => 'Ahmed Ben Ali',
            'email' => 'manager@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $manager->assignRole('member');

        $dev1 = User::create([
            'name' => 'Sami Trabelsi',
            'email' => 'sami@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $dev1->assignRole('member');

        $dev2 = User::create([
            'name' => 'Ines Bouazizi',
            'email' => 'ines@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $dev2->assignRole('member');

        $dev3 = User::create([
            'name' => 'Mohamed Gharbi',
            'email' => 'mohamed@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $dev3->assignRole('member');

        $leila = User::create([
            'name' => 'Leïla Mansouri',
            'email' => 'leila@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $leila->assignRole('member');

        $karim = User::create([
            'name' => 'Karim Jlassi',
            'email' => 'karim@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $karim->assignRole('member');

        $sonia = User::create([
            'name' => 'Sonia Ben Amor',
            'email' => 'sonia@gestion-projets.local',
            'password' => Hash::make('password'),
            'timezone' => 'Africa/Tunis',
            'status' => 'active',
        ]);
        $sonia->assignRole('client'); // 'viewer' a été renommé en 'client' (migration 2026_05_08)

        return [$admin, $manager, $dev1, $dev2, $dev3, $leila, $karim, $sonia];
    }

    // ─────────────────────────────────────────────────────────────
    // SPÉCIALITÉS → UTILISATEURS
    // ─────────────────────────────────────────────────────────────

    private function assignSpecialties(
        User $admin, User $manager,
        User $dev1, User $dev2, User $dev3,
        User $leila, User $karim, User $sonia
    ): void {
        $sp = fn (string $name) => Specialty::where('name', $name)->first()?->id;

        $frontend   = $sp('Frontend');
        $backend    = $sp('Backend');
        $devops     = $sp('DevOps');
        $mobile     = $sp('Mobile');
        $qa         = $sp('QA / Tests');
        $design     = $sp('Design / UX');
        $data       = $sp('Data / BI');
        $ml         = $sp('Machine Learning');
        $gestion    = $sp('Gestion projet');

        // admin : Backend + Gestion projet
        $admin->specialties()->sync(array_filter([$backend, $gestion]));

        // manager : Gestion projet + Backend
        $manager->specialties()->sync(array_filter([$gestion, $backend]));

        // Sami : Backend + Sécurité
        $dev1->specialties()->sync(array_filter([$backend, Specialty::where('name', 'Sécurité')->first()?->id]));

        // Ines : Frontend + Design/UX
        $dev2->specialties()->sync(array_filter([$frontend, $design]));

        // Mohamed : Backend + QA
        $dev3->specialties()->sync(array_filter([$backend, $qa]));

        // Leïla : Mobile + Frontend
        $leila->specialties()->sync(array_filter([$mobile, $frontend]));

        // Karim : DevOps + Data/BI + ML
        $karim->specialties()->sync(array_filter([$devops, $data, $ml]));

        // Sonia (viewer) : QA
        $sonia->specialties()->sync(array_filter([$qa]));
    }

    // ─────────────────────────────────────────────────────────────
    // ÉQUIPES
    // ─────────────────────────────────────────────────────────────

    private function seedTeams(
        User $admin, User $manager,
        User $dev1, User $dev2, User $dev3,
        User $leila, User $karim, User $sonia
    ): array {
        $teamDev = Team::create([
            'name' => 'Équipe Web & Backend',
            'description' => 'Développement des applications web, APIs et services backend.',
            'team_leader_id' => $admin->id,
        ]);
        $teamDev->members()->attach([
            $admin->id   => ['role_in_team' => 'lead',      'capacity_hours_per_week' => 40],
            $manager->id => ['role_in_team' => 'member',    'capacity_hours_per_week' => 35],
            $dev1->id    => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40],
            $dev2->id    => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 35],
            $dev3->id    => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40],
        ]);

        $teamMobile = Team::create([
            'name' => 'Équipe Mobile & UX',
            'description' => 'Applications iOS/Android et expérience utilisateur.',
            'team_leader_id' => $leila->id,
        ]);
        $teamMobile->members()->attach([
            $admin->id  => ['role_in_team' => 'lead',      'capacity_hours_per_week' => 20],
            $leila->id  => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40],
            $dev2->id   => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 35],
            $karim->id  => ['role_in_team' => 'member',    'capacity_hours_per_week' => 20],
            $sonia->id  => ['role_in_team' => 'member',    'capacity_hours_per_week' => 30],
        ]);

        $teamData = Team::create([
            'name' => 'Équipe Data & DevOps',
            'description' => 'Infrastructure cloud, pipelines de données et Machine Learning.',
            'team_leader_id' => $karim->id,
        ]);
        $teamData->members()->attach([
            $admin->id   => ['role_in_team' => 'lead',      'capacity_hours_per_week' => 20],
            $karim->id   => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40],
            $dev3->id    => ['role_in_team' => 'member',    'capacity_hours_per_week' => 40],
            $manager->id => ['role_in_team' => 'member',    'capacity_hours_per_week' => 20],
        ]);

        return [$teamDev, $teamMobile, $teamData];
    }

    // ─────────────────────────────────────────────────────────────
    // PROJET 1 — Plateforme E-commerce
    // ─────────────────────────────────────────────────────────────

    private function seedProject1(
        Team $team, User $admin, User $manager,
        User $dev1, User $dev2, User $dev3
    ): void {
        $sp = fn (string $name) => Specialty::where('name', $name)->first();

        $project = Project::create([
            'code'        => 'ECOM',
            'team_id'     => $team->id,
            'name'        => 'Plateforme E-commerce',
            'description' => 'Développement d\'une plateforme de vente en ligne complète : catalogue, panier, paiement, backoffice et notifications temps réel.',
            'status'      => 'active',
            'start_date'  => '2026-02-01',
            'end_date'    => '2026-08-31',
            'owner_id'    => $admin->id,
            'created_by'  => $admin->id,
        ]);

        $project->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $manager->id => ['project_role' => 'admin'],
            $dev1->id    => ['project_role' => 'member'],
            $dev2->id    => ['project_role' => 'member'],
            $dev3->id    => ['project_role' => 'member'],
        ]);

        // Kanban columns
        $sTodo     = TaskStatus::create(['project_id' => $project->id, 'name' => 'À faire',     'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProgress = TaskStatus::create(['project_id' => $project->id, 'name' => 'En cours',    'color' => '#3B82F6', 'order' => 1]);
        $sReview   = TaskStatus::create(['project_id' => $project->id, 'name' => 'En revue',    'color' => '#F59E0B', 'order' => 2]);
        $sDone     = TaskStatus::create(['project_id' => $project->id, 'name' => 'Terminé',     'color' => '#10B981', 'order' => 3]);

        // Sprints
        $sprint1 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 1 — Socle & Auth',
            'goal' => 'Mise en place de l\'architecture et authentification complète.',
            'status' => 'completed', 'start_date' => '2026-02-01', 'end_date' => '2026-02-14',
            'started_at' => '2026-02-01', 'ended_at' => '2026-02-14',
        ]);
        $sprint2 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 2 — Catalogue & Panier',
            'goal' => 'Fonctionnalités catalogue produits, recherche et panier.',
            'status' => 'active', 'start_date' => '2026-02-15', 'end_date' => '2026-02-28',
            'started_at' => '2026-02-15',
        ]);
        $sprint3 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 3 — Paiement & Commandes',
            'goal' => 'Intégration paiement Stripe et gestion des commandes.',
            'status' => 'planned', 'start_date' => '2026-03-01', 'end_date' => '2026-03-14',
        ]);

        $tasks = [
            // Sprint 1 – DONE
            [
                'title'           => 'Architecture backend Laravel & API REST',
                'description'     => 'Mise en place de Laravel 12, Sanctum, structure des modules, migrations initiales, seeders de rôles.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'urgent',
                'story_points'    => 8,
                'estimated_hours' => 20,
                'actual_hours'    => 18,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-02-01',
                'planned_end'     => '2026-02-06',
                'due_date'        => '2026-02-06',
                'created_by'      => $admin->id,
                'assignees'       => [$dev1->id],
                'specialties'     => array_filter([$sp('Backend')?->id]),
            ],
            [
                'title'           => 'Système d\'authentification (JWT + rôles)',
                'description'     => 'Login, register, logout, reset password, middleware rôles admin/client.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'high',
                'story_points'    => 5,
                'estimated_hours' => 12,
                'actual_hours'    => 11,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-02-04',
                'planned_end'     => '2026-02-08',
                'due_date'        => '2026-02-08',
                'created_by'      => $admin->id,
                'assignees'       => [$dev1->id],
                'specialties'     => array_filter([$sp('Backend')?->id, $sp('Sécurité')?->id]),
            ],
            [
                'title'           => 'Design System & composants UI',
                'description'     => 'Création du design system (couleurs, typographie, boutons, cards, modales) avec Figma et Tailwind.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 24,
                'actual_hours'    => 22,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-02-01',
                'planned_end'     => '2026-02-10',
                'due_date'        => '2026-02-10',
                'created_by'      => $manager->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Design / UX')?->id]),
            ],
            // Sprint 2 – EN COURS
            [
                'title'           => 'Catalogue produits — API & listing',
                'description'     => 'Endpoints CRUD produits, catégories, filtres avancés, pagination, images.',
                'status_id'       => $sProgress->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 20,
                'actual_hours'    => 10,
                'progress_percent'=> 55,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-02-15',
                'planned_end'     => '2026-02-22',
                'due_date'        => '2026-02-22',
                'created_by'      => $manager->id,
                'assignees'       => [$dev1->id],
                'specialties'     => array_filter([$sp('Backend')?->id]),
            ],
            [
                'title'           => 'Page catalogue — Interface frontend',
                'description'     => 'Grille produits, filtres latéraux, tri, pagination infinie, skeleton loading.',
                'status_id'       => $sProgress->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'high',
                'story_points'    => 5,
                'estimated_hours' => 16,
                'actual_hours'    => 8,
                'progress_percent'=> 50,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-02-18',
                'planned_end'     => '2026-02-25',
                'due_date'        => '2026-02-25',
                'created_by'      => $manager->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Design / UX')?->id]),
            ],
            [
                'title'           => 'Moteur de recherche full-text',
                'description'     => 'Recherche avec Elasticsearch ou MySQL FTS, suggestions auto-complétion, correcteur orthographique.',
                'status_id'       => $sReview->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'medium',
                'story_points'    => 5,
                'estimated_hours' => 18,
                'actual_hours'    => 17,
                'progress_percent'=> 90,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-02-16',
                'planned_end'     => '2026-02-24',
                'due_date'        => '2026-02-24',
                'created_by'      => $dev3->id,
                'assignees'       => [$dev3->id],
                'specialties'     => array_filter([$sp('Backend')?->id, $sp('Data / BI')?->id]),
            ],
            [
                'title'           => 'Gestion du panier (API + UI)',
                'description'     => 'Ajout/suppression produits, calcul totaux, coupon promo, persistance session/localStorage.',
                'status_id'       => $sTodo->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 16,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-02-22',
                'planned_end'     => '2026-02-28',
                'due_date'        => '2026-02-28',
                'created_by'      => $manager->id,
                'assignees'       => [$dev1->id, $dev2->id],
                'specialties'     => array_filter([$sp('Backend')?->id, $sp('Frontend')?->id]),
            ],
            // Sprint 3 – À FAIRE
            [
                'title'           => 'Intégration Stripe — Paiement carte',
                'description'     => 'Webhook Stripe, gestion des états de paiement, remboursements, 3DS.',
                'status_id'       => $sTodo->id,
                'sprint_id'       => $sprint3->id,
                'priority'        => 'urgent',
                'story_points'    => 13,
                'estimated_hours' => 24,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-03-01',
                'planned_end'     => '2026-03-08',
                'due_date'        => '2026-03-08',
                'created_by'      => $admin->id,
                'assignees'       => [$dev1->id],
                'specialties'     => array_filter([$sp('Backend')?->id, $sp('Sécurité')?->id]),
            ],
            [
                'title'           => 'Interface paiement & confirmation commande',
                'description'     => 'Page checkout multi-étapes, récapitulatif, confirmation e-mail, suivi commande.',
                'status_id'       => $sTodo->id,
                'sprint_id'       => $sprint3->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 20,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-03-06',
                'planned_end'     => '2026-03-12',
                'due_date'        => '2026-03-12',
                'created_by'      => $manager->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Design / UX')?->id]),
            ],
            // Backlog
            [
                'title'           => 'Tests E2E Playwright — Parcours achat',
                'description'     => 'Suite de tests de bout en bout couvrant catalogue → panier → paiement → confirmation.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 5,
                'estimated_hours' => 14,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-03-10',
                'planned_end'     => '2026-03-20',
                'due_date'        => '2026-03-20',
                'created_by'      => $dev3->id,
                'assignees'       => [$dev3->id],
                'specialties'     => array_filter([$sp('QA / Tests')?->id]),
            ],
            [
                'title'           => 'Dashboard administrateur — Analytiques ventes',
                'description'     => 'KPIs ventes, graphiques revenus, top produits, taux de conversion, exports CSV.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 8,
                'estimated_hours' => 20,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-03-15',
                'planned_end'     => '2026-03-28',
                'due_date'        => '2026-03-28',
                'created_by'      => $admin->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Data / BI')?->id]),
            ],
        ];

        $created = $this->createTasks($project->id, $admin->id, $tasks);

        // Dépendances
        $this->addDep($created, 1, 0); // Auth dépend de Architecture
        $this->addDep($created, 3, 1); // Catalogue API dépend de Auth
        $this->addDep($created, 4, 2); // Catalogue UI dépend de Design System
        $this->addDep($created, 6, 3); // Panier dépend de Catalogue API
        $this->addDep($created, 7, 6); // Stripe dépend de Panier
        $this->addDep($created, 8, 7); // UI Paiement dépend de Stripe

        // Commentaires
        $this->addComment($created[0], $admin->id,   'Architecture validée — migrations, Sanctum et structure modulaire en place. 🚀');
        $this->addComment($created[0], $dev1->id,    'J\'ai ajouté les indexes sur les tables fréquemment filtrées pour les perfs.');
        $this->addComment($created[2], $dev2->id,    'Design system exporté sur Figma. Composants Tailwind prêts, storybook configuré.');
        $this->addComment($created[3], $dev1->id,    'API catalogue à 55% — endpoints GET et POST validés, PATCH et DELETE en cours.');
        $this->addComment($created[5], $dev3->id,    'Full-text search opérationnel. Temps de réponse < 80ms sur 10k produits tests.');

        // Entrées de temps
        $this->addTime($created[0], $dev1->id, '2026-02-01', 480, 'Setup initial Laravel, structure modules');
        $this->addTime($created[0], $dev1->id, '2026-02-02', 420, 'Migrations, seeders rôles et permissions');
        $this->addTime($created[1], $dev1->id, '2026-02-04', 390, 'Auth API : login, register, tokens Sanctum');
        $this->addTime($created[2], $dev2->id, '2026-02-01', 480, 'Tokens couleurs, typographie, grilles Tailwind');
        $this->addTime($created[2], $dev2->id, '2026-02-03', 360, 'Composants Button, Card, Modal, Input');
        $this->addTime($created[3], $dev1->id, '2026-02-15', 300, 'Endpoints catalogue produits GET/POST');
        $this->addTime($created[4], $dev2->id, '2026-02-18', 360, 'Grille produits, skeleton loading');
    }

    // ─────────────────────────────────────────────────────────────
    // PROJET 2 — Application Mobile Santé
    // ─────────────────────────────────────────────────────────────

    private function seedProject2(
        Team $team, User $admin, User $leila,
        User $dev2, User $karim, User $sonia
    ): void {
        $sp = fn (string $name) => Specialty::where('name', $name)->first();

        $project = Project::create([
            'code'        => 'HLTH',
            'team_id'     => $team->id,
            'name'        => 'HealthTrack — App Mobile Santé',
            'description' => 'Application mobile iOS/Android de suivi de santé : activité physique, sommeil, nutrition, rendez-vous médicaux et alertes intelligentes.',
            'status'      => 'active',
            'start_date'  => '2026-03-01',
            'end_date'    => '2026-09-30',
            'owner_id'    => $leila->id,
            'created_by'  => $admin->id,
        ]);

        $project->members()->attach([
            $admin->id  => ['project_role' => 'admin'],
            $leila->id  => ['project_role' => 'admin'],
            $dev2->id   => ['project_role' => 'member'],
            $karim->id  => ['project_role' => 'member'],
            $sonia->id  => ['project_role' => 'member'],
        ]);

        $sTodo     = TaskStatus::create(['project_id' => $project->id, 'name' => 'Backlog',     'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProgress = TaskStatus::create(['project_id' => $project->id, 'name' => 'En cours',   'color' => '#3B82F6', 'order' => 1]);
        $sTest     = TaskStatus::create(['project_id' => $project->id, 'name' => 'En test',    'color' => '#F59E0B', 'order' => 2]);
        $sDone     = TaskStatus::create(['project_id' => $project->id, 'name' => 'Livré',      'color' => '#10B981', 'order' => 3]);

        $sprint1 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 1 — Fondations & Onboarding',
            'goal' => 'Architecture React Native, onboarding et authentification biométrique.',
            'status' => 'completed', 'start_date' => '2026-03-01', 'end_date' => '2026-03-14',
            'started_at' => '2026-03-01', 'ended_at' => '2026-03-14',
        ]);
        $sprint2 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 2 — Tracking Activité',
            'goal' => 'Module suivi d\'activité physique avec capteurs et graphiques.',
            'status' => 'active', 'start_date' => '2026-03-15', 'end_date' => '2026-03-28',
            'started_at' => '2026-03-15',
        ]);

        $tasks = [
            [
                'title'           => 'Architecture React Native & navigation',
                'description'     => 'Setup React Native avec Expo, stack navigation, theming, gestion d\'état Zustand.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'urgent',
                'story_points'    => 8,
                'estimated_hours' => 16,
                'actual_hours'    => 15,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-03-01',
                'planned_end'     => '2026-03-06',
                'due_date'        => '2026-03-06',
                'created_by'      => $leila->id,
                'assignees'       => [$leila->id],
                'specialties'     => array_filter([$sp('Mobile')?->id]),
            ],
            [
                'title'           => 'Screens onboarding & authentification',
                'description'     => 'Écrans intro, inscription, connexion biométrique (Face ID, empreinte), gestion tokens.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'high',
                'story_points'    => 5,
                'estimated_hours' => 12,
                'actual_hours'    => 13,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-03-05',
                'planned_end'     => '2026-03-10',
                'due_date'        => '2026-03-10',
                'created_by'      => $leila->id,
                'assignees'       => [$leila->id, $dev2->id],
                'specialties'     => array_filter([$sp('Mobile')?->id, $sp('Design / UX')?->id]),
            ],
            [
                'title'           => 'UI Kit mobile — Design Figma',
                'description'     => 'Composants mobiles : cards métriques, graphiques, badges, bottom sheets, animations.',
                'status_id'       => $sDone->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'high',
                'story_points'    => 5,
                'estimated_hours' => 14,
                'actual_hours'    => 12,
                'progress_percent'=> 100,
                'workflow_status' => 'done',
                'planned_start'   => '2026-03-01',
                'planned_end'     => '2026-03-08',
                'due_date'        => '2026-03-08',
                'created_by'      => $admin->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Design / UX')?->id, $sp('Mobile')?->id]),
            ],
            [
                'title'           => 'Module tracking pas & activité (podomètre)',
                'description'     => 'Intégration capteurs natifs, comptage pas, calories, distance, historique journalier.',
                'status_id'       => $sProgress->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 20,
                'actual_hours'    => 10,
                'progress_percent'=> 60,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-03-15',
                'planned_end'     => '2026-03-22',
                'due_date'        => '2026-03-22',
                'created_by'      => $leila->id,
                'assignees'       => [$leila->id],
                'specialties'     => array_filter([$sp('Mobile')?->id]),
            ],
            [
                'title'           => 'Graphiques progression & statistiques',
                'description'     => 'Charts semaine/mois (Victory Native), streaks, objectifs, comparaisons périodes.',
                'status_id'       => $sProgress->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'medium',
                'story_points'    => 5,
                'estimated_hours' => 14,
                'actual_hours'    => 6,
                'progress_percent'=> 40,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-03-18',
                'planned_end'     => '2026-03-25',
                'due_date'        => '2026-03-25',
                'created_by'      => $leila->id,
                'assignees'       => [$dev2->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Data / BI')?->id]),
            ],
            [
                'title'           => 'API backend — Données santé & sync cloud',
                'description'     => 'Endpoints sync santé, agrégats journaliers, export HealthKit/Google Fit.',
                'status_id'       => $sTest->id,
                'sprint_id'       => $sprint2->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 18,
                'actual_hours'    => 17,
                'progress_percent'=> 95,
                'workflow_status' => 'in_progress',
                'planned_start'   => '2026-03-15',
                'planned_end'     => '2026-03-24',
                'due_date'        => '2026-03-24',
                'created_by'      => $admin->id,
                'assignees'       => [$karim->id],
                'specialties'     => array_filter([$sp('Backend')?->id, $sp('DevOps')?->id]),
            ],
            [
                'title'           => 'Pipeline CI/CD — Build & déploiement stores',
                'description'     => 'GitHub Actions, Fastlane iOS/Android, signature, TestFlight + Play Console.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 5,
                'estimated_hours' => 12,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-01',
                'planned_end'     => '2026-04-10',
                'due_date'        => '2026-04-10',
                'created_by'      => $admin->id,
                'assignees'       => [$karim->id],
                'specialties'     => array_filter([$sp('DevOps')?->id]),
            ],
            [
                'title'           => 'Tests QA — Scénarios utilisateur mobile',
                'description'     => 'Tests fonctionnels iOS/Android, rapport Allure, test régressions biométriques.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 3,
                'estimated_hours' => 10,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-05',
                'planned_end'     => '2026-04-15',
                'due_date'        => '2026-04-15',
                'created_by'      => $admin->id,
                'assignees'       => [$sonia->id],
                'specialties'     => array_filter([$sp('QA / Tests')?->id, $sp('Mobile')?->id]),
            ],
        ];

        $created = $this->createTasks($project->id, $admin->id, $tasks);

        $this->addDep($created, 1, 0);
        $this->addDep($created, 3, 0);
        $this->addDep($created, 4, 2);
        $this->addDep($created, 5, 0);
        $this->addDep($created, 6, 5);
        $this->addDep($created, 7, 3);

        $this->addComment($created[0], $leila->id, 'Setup Expo + navigation terminé. Dark mode opérationnel, Zustand configuré.');
        $this->addComment($created[1], $dev2->id,  'Screens d\'onboarding validés avec le client. Animation Lottie intégrée.');
        $this->addComment($created[3], $leila->id, 'Podomètre fonctionnel sur iOS. Android en cours de calibration des capteurs.');
        $this->addComment($created[5], $karim->id, 'API déployée sur staging. Tests de charge OK (500 req/s). ✅');

        $this->addTime($created[0], $leila->id, '2026-03-01', 480, 'Setup React Native, Expo config');
        $this->addTime($created[1], $leila->id, '2026-03-05', 360, 'Écrans onboarding, animations');
        $this->addTime($created[3], $leila->id, '2026-03-15', 420, 'Intégration capteurs iOS, podomètre');
        $this->addTime($created[5], $karim->id, '2026-03-15', 480, 'API endpoints sync, Kubernetes deploy');
    }

    // ─────────────────────────────────────────────────────────────
    // PROJET 3 — Plateforme Data & IA
    // ─────────────────────────────────────────────────────────────

    private function seedProject3(
        Team $team, User $admin,
        User $karim, User $dev3, User $manager
    ): void {
        $sp = fn (string $name) => Specialty::where('name', $name)->first();

        $project = Project::create([
            'code'        => 'DAIA',
            'team_id'     => $team->id,
            'name'        => 'DataSight — Plateforme Analytics & IA',
            'description' => 'Plateforme centralisée d\'analytiques métier avec tableaux de bord temps réel, pipelines ETL, et modèles de Machine Learning pour la prédiction et la recommandation.',
            'status'      => 'planning',
            'start_date'  => '2026-04-01',
            'end_date'    => '2026-12-31',
            'owner_id'    => $karim->id,
            'created_by'  => $admin->id,
        ]);

        $project->members()->attach([
            $admin->id   => ['project_role' => 'admin'],
            $karim->id   => ['project_role' => 'admin'],
            $dev3->id    => ['project_role' => 'member'],
            $manager->id => ['project_role' => 'member'],
        ]);

        $sTodo     = TaskStatus::create(['project_id' => $project->id, 'name' => 'À planifier',  'color' => '#6B7280', 'order' => 0, 'is_default' => true]);
        $sProgress = TaskStatus::create(['project_id' => $project->id, 'name' => 'En cours',     'color' => '#3B82F6', 'order' => 1]);
        $sDone     = TaskStatus::create(['project_id' => $project->id, 'name' => 'Terminé',      'color' => '#10B981', 'order' => 2]);

        $sprint1 = Sprint::create([
            'project_id' => $project->id, 'name' => 'Sprint 1 — Infrastructure Data',
            'goal' => 'Mise en place infrastructure data : entrepôt, pipeline ETL, monitoring.',
            'status' => 'planned', 'start_date' => '2026-04-07', 'end_date' => '2026-04-20',
        ]);

        $tasks = [
            [
                'title'           => 'Infrastructure data warehouse (Snowflake/BigQuery)',
                'description'     => 'Provisionnement data warehouse cloud, schémas dimensionnels, partitionnement, accès IAM.',
                'status_id'       => $sTodo->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'urgent',
                'story_points'    => 13,
                'estimated_hours' => 32,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-07',
                'planned_end'     => '2026-04-14',
                'due_date'        => '2026-04-14',
                'created_by'      => $karim->id,
                'assignees'       => [$karim->id],
                'specialties'     => array_filter([$sp('DevOps')?->id, $sp('Data / BI')?->id]),
            ],
            [
                'title'           => 'Pipeline ETL — Ingestion multi-sources',
                'description'     => 'Apache Airflow / dbt pour extraction, transformation et chargement depuis ERP, CRM, APIs tierces.',
                'status_id'       => $sTodo->id,
                'sprint_id'       => $sprint1->id,
                'priority'        => 'high',
                'story_points'    => 13,
                'estimated_hours' => 40,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-10',
                'planned_end'     => '2026-04-20',
                'due_date'        => '2026-04-20',
                'created_by'      => $karim->id,
                'assignees'       => [$karim->id, $dev3->id],
                'specialties'     => array_filter([$sp('Data / BI')?->id, $sp('Backend')?->id]),
            ],
            [
                'title'           => 'Dashboard temps réel — KPIs business',
                'description'     => 'Tableau de bord avec widgets drag & drop, graphiques (Chart.js/D3), alertes seuils, export PDF.',
                'status_id'       => $sTodo->id,
                'priority'        => 'high',
                'story_points'    => 8,
                'estimated_hours' => 28,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-21',
                'planned_end'     => '2026-05-05',
                'due_date'        => '2026-05-05',
                'created_by'      => $manager->id,
                'assignees'       => [$dev3->id],
                'specialties'     => array_filter([$sp('Frontend')?->id, $sp('Data / BI')?->id]),
            ],
            [
                'title'           => 'Modèle ML — Prédiction churn clients',
                'description'     => 'Modèle de classification (Random Forest / XGBoost) pour prédire l\'attrition clients. Feature engineering, entraînement, évaluation AUC-ROC.',
                'status_id'       => $sTodo->id,
                'priority'        => 'high',
                'story_points'    => 13,
                'estimated_hours' => 40,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-05-01',
                'planned_end'     => '2026-05-20',
                'due_date'        => '2026-05-20',
                'created_by'      => $karim->id,
                'assignees'       => [$karim->id],
                'specialties'     => array_filter([$sp('Machine Learning')?->id, $sp('Data / BI')?->id]),
            ],
            [
                'title'           => 'API ML — Serving et intégration',
                'description'     => 'FastAPI / BentoML pour exposer les modèles, versioning MLflow, A/B testing, monitoring drift.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 8,
                'estimated_hours' => 24,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-05-20',
                'planned_end'     => '2026-06-05',
                'due_date'        => '2026-06-05',
                'created_by'      => $karim->id,
                'assignees'       => [$karim->id, $dev3->id],
                'specialties'     => array_filter([$sp('Machine Learning')?->id, $sp('Backend')?->id, $sp('DevOps')?->id]),
            ],
            [
                'title'           => 'Tests qualité données & monitoring pipeline',
                'description'     => 'Great Expectations pour tests qualité données, alertes Slack pipeline, SLA monitoring.',
                'status_id'       => $sTodo->id,
                'priority'        => 'medium',
                'story_points'    => 5,
                'estimated_hours' => 16,
                'progress_percent'=> 0,
                'workflow_status' => 'todo',
                'planned_start'   => '2026-04-21',
                'planned_end'     => '2026-04-30',
                'due_date'        => '2026-04-30',
                'created_by'      => $dev3->id,
                'assignees'       => [$dev3->id],
                'specialties'     => array_filter([$sp('QA / Tests')?->id, $sp('Data / BI')?->id]),
            ],
        ];

        $created = $this->createTasks($project->id, $admin->id, $tasks);

        $this->addDep($created, 1, 0); // ETL dépend de Data Warehouse
        $this->addDep($created, 2, 1); // Dashboard dépend de ETL
        $this->addDep($created, 3, 1); // Modèle ML dépend de ETL
        $this->addDep($created, 4, 3); // API ML dépend de Modèle ML
        $this->addDep($created, 5, 1); // Tests qualité dépend de ETL

        $this->addComment($created[0], $karim->id,  'Architecture data warehouse validée. J\'opte pour Snowflake — meilleur rapport coût/perf pour notre volume.');
        $this->addComment($created[1], $karim->id,  'Orchestration Airflow vs Prefect en cours d\'évaluation. dbt pour les transformations SQL.');
        $this->addComment($created[3], $karim->id,  'Dataset initial : 200k clients, 18 mois historique. Feature engineering planifié pour semaine 2.');
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    /** @return Task[] */
    private function createTasks(int $projectId, int $createdBy, array $tasksData): array
    {
        $created = [];
        foreach ($tasksData as $i => $data) {
            $assignees  = $data['assignees'] ?? [];
            $specialties = $data['specialties'] ?? [];
            unset($data['assignees'], $data['specialties']);

            $task = Task::create(array_merge($data, [
                'project_id'   => $projectId,
                'created_by'   => $data['created_by'] ?? $createdBy,
                'kanban_order' => $i,
                'position'     => $i,
            ]));

            foreach ($assignees as $userId) {
                $task->assignees()->syncWithoutDetaching([$userId => ['allocation_percent' => 100]]);
            }

            if (!empty($specialties)) {
                $task->specialties()->sync($specialties);
            }

            $created[] = $task;
        }

        return $created;
    }

    private function addDep(array $tasks, int $from, int $to): void
    {
        if (isset($tasks[$from], $tasks[$to])) {
            $tasks[$from]->dependencies()->syncWithoutDetaching([
                $tasks[$to]->id => ['type' => 'FS'],
            ]);
        }
    }

    private function addComment(Task $task, int $userId, string $body): void
    {
        TaskComment::create(['task_id' => $task->id, 'user_id' => $userId, 'body' => $body]);
    }

    private function addTime(Task $task, int $userId, string $date, int $minutes, string $note): void
    {
        TimeEntry::create([
            'task_id' => $task->id,
            'user_id' => $userId,
            'date'    => $date,
            'minutes' => $minutes,
            'note'    => $note,
            'source'  => 'manual',
        ]);
    }
}
