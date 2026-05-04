<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Specialty;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Generates a rich, realistic ML training dataset.
 *
 * Personas (15 users) with distinct performance profiles feed 3 completed
 * projects (~200 tasks total) so the gradient-descent trainer has meaningful
 * signal to learn from on first run.
 */
class MLTrainingDataSeeder extends Seeder
{
    // -------------------------------------------------------------------------
    // Specialties catalogue
    // -------------------------------------------------------------------------
    private const SPECIALTIES = [
        ['name' => 'Backend Development',  'color' => '#3B82F6'],
        ['name' => 'Frontend Development', 'color' => '#10B981'],
        ['name' => 'DevOps / CI-CD',       'color' => '#F59E0B'],
        ['name' => 'Data Science / ML',    'color' => '#8B5CF6'],
        ['name' => 'UX / UI Design',       'color' => '#EC4899'],
        ['name' => 'QA / Testing',         'color' => '#EF4444'],
        ['name' => 'Mobile Development',   'color' => '#06B6D4'],
        ['name' => 'Database / DBA',       'color' => '#84CC16'],
        ['name' => 'Security',             'color' => '#F97316'],
        ['name' => 'Project Management',   'color' => '#6366F1'],
    ];

    /**
     * User personas: each defines specialty indices (0-based), and
     * performance multipliers used when generating task outcomes.
     *
     * completion_rate: probability the task is completed (done)
     * on_time_rate:    probability completion is before due_date
     * hours_accuracy:  1 – abs(actual/estimated – 1)  →  0.8 = 20% error
     */
    private const PERSONAS = [
        // High-performers
        [
            'name' => 'Alice Dupont',     'email' => 'alice@ml-seed.test',
            'specialties' => [0, 7, 3],  // Backend + DB + DS
            'completion_rate' => 0.95,   'on_time_rate' => 0.90, 'hours_accuracy' => 0.85,
            'complexity_pref' => [5, 9], // prefers complex tasks
        ],
        [
            'name' => 'Bob Lefebvre',     'email' => 'bob@ml-seed.test',
            'specialties' => [1, 4],     // Frontend + UX
            'completion_rate' => 0.92,   'on_time_rate' => 0.88, 'hours_accuracy' => 0.82,
            'complexity_pref' => [3, 7],
        ],
        [
            'name' => 'Clara Martin',     'email' => 'clara@ml-seed.test',
            'specialties' => [0, 1, 7],  // Full-stack + DB
            'completion_rate' => 0.93,   'on_time_rate' => 0.87, 'hours_accuracy' => 0.88,
            'complexity_pref' => [4, 8],
        ],

        // Average performers
        [
            'name' => 'David Bernard',    'email' => 'david@ml-seed.test',
            'specialties' => [2],         // DevOps only
            'completion_rate' => 0.78,   'on_time_rate' => 0.70, 'hours_accuracy' => 0.72,
            'complexity_pref' => [3, 6],
        ],
        [
            'name' => 'Emma Rousseau',    'email' => 'emma@ml-seed.test',
            'specialties' => [5, 3],     // QA + DS
            'completion_rate' => 0.80,   'on_time_rate' => 0.72, 'hours_accuracy' => 0.75,
            'complexity_pref' => [2, 6],
        ],
        [
            'name' => 'François Leroy',   'email' => 'francois@ml-seed.test',
            'specialties' => [0],         // Backend only
            'completion_rate' => 0.76,   'on_time_rate' => 0.68, 'hours_accuracy' => 0.70,
            'complexity_pref' => [3, 7],
        ],
        [
            'name' => 'Gabrielle Simon',  'email' => 'gabrielle@ml-seed.test',
            'specialties' => [6],         // Mobile only
            'completion_rate' => 0.82,   'on_time_rate' => 0.74, 'hours_accuracy' => 0.78,
            'complexity_pref' => [4, 7],
        ],

        // Low / inconsistent performers
        [
            'name' => 'Hugo Thomas',      'email' => 'hugo@ml-seed.test',
            'specialties' => [1, 4],     // Frontend + UX
            'completion_rate' => 0.55,   'on_time_rate' => 0.45, 'hours_accuracy' => 0.55,
            'complexity_pref' => [1, 5],
        ],
        [
            'name' => 'Isabelle Lambert', 'email' => 'isabelle@ml-seed.test',
            'specialties' => [8],         // Security
            'completion_rate' => 0.60,   'on_time_rate' => 0.50, 'hours_accuracy' => 0.58,
            'complexity_pref' => [4, 8],
        ],

        // Overloaded (many active tasks)
        [
            'name' => 'Julien Moreau',    'email' => 'julien@ml-seed.test',
            'specialties' => [0, 2],     // Backend + DevOps
            'completion_rate' => 0.70,   'on_time_rate' => 0.55, 'hours_accuracy' => 0.65,
            'complexity_pref' => [3, 7],
            'extra_load' => 6,            // will get 6 extra active tasks
        ],

        // Specialists with deep expertise
        [
            'name' => 'Karim Petit',      'email' => 'karim@ml-seed.test',
            'specialties' => [3],         // Data Science specialist
            'completion_rate' => 0.90,   'on_time_rate' => 0.85, 'hours_accuracy' => 0.80,
            'complexity_pref' => [6, 10],
        ],
        [
            'name' => 'Laura Faure',      'email' => 'laura@ml-seed.test',
            'specialties' => [9, 0],     // PM + Backend
            'completion_rate' => 0.88,   'on_time_rate' => 0.82, 'hours_accuracy' => 0.83,
            'complexity_pref' => [3, 7],
        ],

        // Junior / improving
        [
            'name' => 'Marc Gauthier',    'email' => 'marc@ml-seed.test',
            'specialties' => [0],
            'completion_rate' => 0.65,   'on_time_rate' => 0.60, 'hours_accuracy' => 0.62,
            'complexity_pref' => [1, 4],
            'improving' => true,          // recent perf is better than historic
        ],
        [
            'name' => 'Nadia Perrin',     'email' => 'nadia@ml-seed.test',
            'specialties' => [1, 6],     // Frontend + Mobile
            'completion_rate' => 0.68,   'on_time_rate' => 0.62, 'hours_accuracy' => 0.65,
            'complexity_pref' => [2, 5],
            'improving' => true,
        ],

        // Versatile generalist
        [
            'name' => 'Olivier Nguyen',   'email' => 'olivier@ml-seed.test',
            'specialties' => [0, 1, 2, 5, 7], // many specialties
            'completion_rate' => 0.84,   'on_time_rate' => 0.76, 'hours_accuracy' => 0.80,
            'complexity_pref' => [2, 8],
        ],
    ];

    private array $specialtyIds = [];
    private array $userIds      = [];

    public function run(): void
    {
        $this->command->info('🌱 ML Training Data Seeder started...');

        $this->ensureSpecialties();
        $this->ensureTeam();
        $users    = $this->createOrFindUsers();
        $projects = $this->createProjects($users);

        foreach ($projects as [$project, $members]) {
            $this->generateProjectHistory($project, $members);
        }

        $this->addExtraLoad($users);

        $this->command->info('✅ ML training dataset ready. Run: php artisan ml:train');
    }

    // -------------------------------------------------------------------------

    private function ensureSpecialties(): void
    {
        foreach (self::SPECIALTIES as $spec) {
            $s = Specialty::firstOrCreate(['name' => $spec['name']], ['color' => $spec['color'], 'description' => '']);
            $this->specialtyIds[] = $s->id;
        }
        $this->command->info('  Specialties: ' . count($this->specialtyIds) . ' loaded.');
    }

    private function ensureTeam(): void
    {
        Team::firstOrCreate(['name' => 'ML Seed Team'], ['description' => 'Auto-created for ML training data']);
    }

    private function createOrFindUsers(): array
    {
        $team = Team::where('name', 'ML Seed Team')->first();
        $users = [];

        foreach (self::PERSONAS as $persona) {
            $user = User::firstOrCreate(
                ['email' => $persona['email']],
                [
                    'name'     => $persona['name'],
                    'password' => Hash::make('password'),
                    'status'   => 'active',
                ]
            );

            if (!$user->hasRole('member')) {
                $user->assignRole('member');
            }

            // Sync specialties
            $specIds = array_map(fn($i) => $this->specialtyIds[$i], $persona['specialties']);
            $user->specialties()->syncWithoutDetaching($specIds);

            // Add to team
            $team->members()->syncWithoutDetaching([$user->id => ['capacity_hours_per_week' => 40]]);

            $users[] = ['user' => $user, 'persona' => $persona];
        }

        $this->command->info('  Users: ' . count($users) . ' created/found.');
        return $users;
    }

    private function createProjects(array $users): array
    {
        $team = Team::where('name', 'ML Seed Team')->first();
        $ownerUser = $users[0]['user'];

        $projectDefs = [
            ['name' => 'ERP Backend Refactor',   'code' => 'ERP-ML',  'member_count' => 8],
            ['name' => 'Mobile App v2',           'code' => 'MOB-ML',  'member_count' => 6],
            ['name' => 'Data Analytics Platform', 'code' => 'DATA-ML', 'member_count' => 7],
        ];

        $projects = [];
        foreach ($projectDefs as $i => $def) {
            $project = Project::firstOrCreate(
                ['name' => $def['name'], 'team_id' => $team->id],
                [
                    'code'               => $def['code'],
                    'description'        => "ML seeded project: {$def['name']}",
                    'status'             => 'completed',
                    'priority'           => 'high',
                    'start_date'         => Carbon::now()->subMonths(6 - $i),
                    'end_date'           => Carbon::now()->subMonths(3 - $i),
                    'owner_id'           => $ownerUser->id,
                    'created_by'         => $ownerUser->id,
                    'project_manager_id' => $ownerUser->id,
                ]
            );

            // Create default task statuses
            $this->ensureStatuses($project);

            // Assign members
            $members = array_slice($users, 0, $def['member_count']);
            foreach ($members as $m) {
                DB::table('project_user')->updateOrInsert(
                    ['project_id' => $project->id, 'user_id' => $m['user']->id],
                    ['role' => 'member', 'updated_at' => now(), 'created_at' => now()]
                );
                DB::table('project_members')->updateOrInsert(
                    ['project_id' => $project->id, 'user_id' => $m['user']->id],
                    ['project_role' => 'member', 'updated_at' => now(), 'created_at' => now()]
                );
            }

            $projects[] = [$project, $members];
        }

        $this->command->info('  Projects: ' . count($projects) . ' created/found.');
        return $projects;
    }

    private function ensureStatuses(Project $project): void
    {
        $cols = ['To Do', 'In Progress', 'Done'];
        foreach ($cols as $order => $col) {
            TaskStatus::firstOrCreate(
                ['project_id' => $project->id, 'name' => $col],
                ['color' => '#6b7280', 'order' => $order]
            );
        }
    }

    private function generateProjectHistory(Project $project, array $members): void
    {
        $taskDefs = $this->buildTaskTemplates();
        $status   = TaskStatus::where('project_id', $project->id)->where('name', 'Done')->first();

        $count = 0;
        foreach ($taskDefs as $def) {
            // Pick members with matching specialty
            $eligible = array_filter($members, function ($m) use ($def) {
                $userSpecialtyIds = $m['user']->specialties()->pluck('specialties.id')->toArray();
                foreach ($def['specialty_indices'] as $si) {
                    if (in_array($this->specialtyIds[$si], $userSpecialtyIds)) return true;
                }
                return false;
            });

            if (empty($eligible)) $eligible = $members; // fallback
            $member  = $eligible[array_rand($eligible)];
            $persona = $member['persona'];
            $user    = $member['user'];

            $isImproving = $persona['improving'] ?? false;

            // Determine outcome based on persona profile
            $dice = mt_rand() / mt_getrandmax();
            $completionRate = $isImproving
                ? $this->interpolateImproving($persona['completion_rate'])
                : $persona['completion_rate'];
            $isDone = $dice < $completionRate;

            $start = $project->start_date
                ? Carbon::parse($project->start_date)->addDays(rand(0, 60))
                : Carbon::now()->subDays(rand(30, 120));

            $durationDays = $def['duration_days'];
            $due          = $start->copy()->addDays($durationDays);

            $estimatedHours = $def['estimated_hours'];

            // Task creation
            $task = Task::firstOrCreate(
                [
                    'title'      => "{$def['title']} – {$project->name}",
                    'project_id' => $project->id,
                ],
                [
                    'description'     => $def['description'],
                    'issue_type'      => $def['issue_type'],
                    'priority'        => $def['priority'],
                    'complexity'      => $def['complexity'],
                    'story_points'    => $def['story_points'] ?? null,
                    'planned_start'   => $start,
                    'planned_end'     => $due,
                    'due_date'        => $due,
                    'estimated_hours' => $estimatedHours,
                    'workflow_status' => $isDone ? 'done' : 'in_progress',
                    'status_id'       => $isDone ? $status?->id : null,
                    'created_by'      => $user->id,
                    'created_at'      => $start,
                    'updated_at'      => $isDone ? $this->completionDate($due, $persona) : now(),
                    'actual_hours'    => $isDone ? $this->actualHours($estimatedHours, $persona) : 0,
                    'progress_percent' => $isDone ? 100 : rand(10, 80),
                ]
            );

            // Attach specialty
            $specIds = array_map(fn($i) => $this->specialtyIds[$i], $def['specialty_indices']);
            $task->specialties()->syncWithoutDetaching($specIds);

            // Assignment
            DB::table('task_assignments')->updateOrInsert(
                ['task_id' => $task->id, 'user_id' => $user->id],
                [
                    'allocation_percent' => 100,
                    'assigned_at'        => $start,
                    'updated_at'         => now(),
                    'created_at'         => $start,
                ]
            );

            $count++;
        }

        $this->command->info("  Project '{$project->name}': {$count} tasks seeded.");
    }

    /**
     * Generates ~200 diverse task templates across priorities, types, and specialties.
     */
    private function buildTaskTemplates(): array
    {
        $templates = [];
        $priorities  = ['low', 'medium', 'high', 'urgent'];
        $types       = ['task', 'bug', 'story'];
        $specialtyGroups = [
            [0],         // Backend
            [1],         // Frontend
            [2],         // DevOps
            [3],         // DS/ML
            [4],         // UX
            [5],         // QA
            [6],         // Mobile
            [7],         // DBA
            [8],         // Security
            [0, 7],      // Backend + DB
            [0, 1],      // Full-stack
            [1, 4],      // Frontend + UX
            [3, 0],      // DS + Backend
            [6, 1],      // Mobile + Frontend
        ];

        $taskTitles = [
            'task'  => [
                'Implement authentication module',
                'Refactor database queries',
                'Add pagination to list endpoint',
                'Setup CI/CD pipeline',
                'Create data migration script',
                'Build dashboard analytics widget',
                'Optimize slow API endpoints',
                'Integrate third-party payment SDK',
                'Write unit tests for service layer',
                'Design entity-relationship diagram',
                'Configure caching layer',
                'Build export to CSV feature',
                'Implement rate limiting',
                'Add multi-language support',
                'Develop push notification service',
                'Create automated backup system',
                'Build audit logging module',
                'Implement file upload service',
                'Develop search functionality',
                'Set up monitoring & alerting',
            ],
            'bug'   => [
                'Fix race condition in task assignment',
                'Resolve memory leak in background job',
                'Fix broken pagination on mobile',
                'Correct timezone handling in calendar',
                'Fix XSS vulnerability in comments',
                'Resolve login session timeout issue',
                'Fix broken image upload on Safari',
                'Correct currency rounding in invoices',
                'Fix notification delivery failure',
                'Resolve SQL injection in search',
                'Fix incorrect permission check',
                'Correct date parsing in Gantt chart',
            ],
            'story' => [
                'As a user I can manage my profile',
                'As an admin I can export project reports',
                'As a member I receive deadline reminders',
                'As a viewer I can see project Gantt',
                'As a team lead I can balance workload',
                'As a dev I can deploy with one command',
                'As a user I can comment with @mentions',
                'As an admin I manage team permissions',
            ],
        ];

        // Generate 70 templates
        foreach (range(0, 69) as $i) {
            $type      = $types[$i % 3];
            $priority  = $priorities[$i % 4];
            $specs     = $specialtyGroups[$i % count($specialtyGroups)];
            $title     = $taskTitles[$type][$i % count($taskTitles[$type])];
            $complex   = rand(1, 10);
            $estHours  = max(1, rand(1, 6) * ($complex / 2));

            $templates[] = [
                'title'            => $title . ' #' . ($i + 1),
                'description'      => "Seeded task #{$i}: {$title}",
                'issue_type'       => $type,
                'priority'         => $priority,
                'complexity'       => $complex,
                'story_points'     => in_array($type, ['task', 'story']) ? rand(1, 13) : null,
                'estimated_hours'  => $estHours,
                'duration_days'    => max(1, (int)ceil($estHours / 8)),
                'specialty_indices' => $specs,
            ];
        }

        return $templates;
    }

    private function completionDate(Carbon $dueDate, array $persona): Carbon
    {
        $dice = mt_rand() / mt_getrandmax();
        if ($dice < $persona['on_time_rate']) {
            // On time: 1-3 days before due
            return $dueDate->copy()->subDays(rand(0, 3));
        }
        // Late: 1-7 days after due
        return $dueDate->copy()->addDays(rand(1, 7));
    }

    private function actualHours(float $estimated, array $persona): float
    {
        $accuracy  = $persona['hours_accuracy'];
        $maxError  = (1 - $accuracy) * 2; // e.g. 0.85 accuracy → max 30% error
        $error     = (mt_rand() / mt_getrandmax()) * $maxError - ($maxError / 2);
        return max(0.5, round($estimated * (1 + $error), 1));
    }

    private function interpolateImproving(float $baseRate): float
    {
        // Improving user: slightly better than historic base
        return min(1.0, $baseRate + 0.15);
    }

    /**
     * Adds extra active (non-done) tasks to "overloaded" personas.
     */
    private function addExtraLoad(array $users): void
    {
        foreach ($users as $m) {
            $extraLoad = $m['persona']['extra_load'] ?? 0;
            if ($extraLoad === 0) continue;

            $user    = $m['user'];
            $project = Project::where('name', 'ERP Backend Refactor')->first();
            if (!$project) continue;

            foreach (range(1, $extraLoad) as $j) {
                $task = Task::create([
                    'title'           => "Active task {$j} for {$user->name}",
                    'project_id'      => $project->id,
                    'issue_type'      => 'task',
                    'priority'        => 'medium',
                    'complexity'      => 5,
                    'workflow_status' => 'in_progress',
                    'estimated_hours' => 8,
                    'due_date'        => Carbon::now()->addDays(rand(2, 14)),
                    'created_by'      => $user->id,
                    'progress_percent' => rand(10, 60),
                ]);

                DB::table('task_assignments')->insert([
                    'task_id'            => $task->id,
                    'user_id'            => $user->id,
                    'allocation_percent' => 100,
                    'assigned_at'        => now(),
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ]);
            }
        }
    }
}
