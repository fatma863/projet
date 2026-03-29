<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifies_user_when_assigned_to_task(): void
    {
        [$actor, $task, $project] = $this->seedProjectTask();
        $assignee = User::factory()->create();
        $project->members()->syncWithoutDetaching([$assignee->id => ['project_role' => 'developer']]);

        Sanctum::actingAs($actor);
        $this->postJson("/api/tasks/{$task->id}/assign", ['user_id' => $assignee->id])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $assignee->id,
            'type' => 'task_assigned',
        ]);
    }

    public function test_notifies_assignees_when_task_is_delayed(): void
    {
        [$actor, $task, $project] = $this->seedProjectTask();
        $assignee = User::factory()->create();
        $project->members()->syncWithoutDetaching([$assignee->id => ['project_role' => 'developer']]);

        Sanctum::actingAs($actor);
        $this->postJson("/api/tasks/{$task->id}/assign", ['user_id' => $assignee->id])->assertOk();
        $this->putJson("/api/tasks/{$task->id}", [
            'due_date' => now()->subDay()->toDateString(),
            'progress_percent' => 20,
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $assignee->id,
            'type' => 'task_delayed',
        ]);
    }

    private function seedProjectTask(): array
    {
        $user = User::factory()->create();
        $project = Project::query()->create([
            'name' => 'Notif Project',
            'code' => 'NTF'.random_int(100, 999),
            'status' => 'active',
            'owner_id' => $user->id,
            'created_by' => $user->id,
        ]);
        $project->members()->attach($user->id, ['project_role' => 'owner']);

        $status = TaskStatus::query()->create([
            'project_id' => $project->id,
            'name' => 'Todo',
            'color' => '#6B7280',
            'order' => 0,
            'is_default' => true,
        ]);

        $task = Task::query()->create([
            'project_id' => $project->id,
            'title' => 'Notify task',
            'status_id' => $status->id,
            'created_by' => $user->id,
        ]);

        return [$user, $task, $project];
    }
}
