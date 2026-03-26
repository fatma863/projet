<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RealtimeCollaborationTest extends TestCase
{
    use RefreshDatabase;

    public function test_comments_api_keeps_timestamp_fields(): void
    {
        [$user, $task] = $this->seedProjectTask();
        Sanctum::actingAs($user);

        $this->postJson("/api/tasks/{$task->id}/comments", ['body' => 'Hello comment'])->assertCreated();
        $response = $this->getJson("/api/tasks/{$task->id}/comments")->assertOk();

        $response->assertJsonStructure([
            'comments' => [
                '*' => ['id', 'task_id', 'body', 'created_at', 'updated_at'],
            ],
        ]);
    }

    public function test_mentions_create_notification_for_targeted_user(): void
    {
        [$author, $task, $project] = $this->seedProjectTask();
        $target = User::factory()->create(['email' => 'john@example.com']);
        $project->members()->syncWithoutDetaching([$target->id => ['project_role' => 'developer']]);

        Sanctum::actingAs($author);

        $this->postJson("/api/tasks/{$task->id}/comments", ['body' => 'Please review this @john'])
            ->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $target->id,
            'type' => 'mention',
        ]);
    }

    public function test_project_activity_endpoint_lists_latest_actions(): void
    {
        [$user, $task, $project] = $this->seedProjectTask();
        Sanctum::actingAs($user);

        $this->postJson("/api/tasks/{$task->id}/comments", ['body' => 'Track this action'])->assertCreated();
        $response = $this->getJson("/api/projects/{$project->id}/activity")->assertOk();

        $response->assertJsonStructure([
            'activities' => [
                '*' => ['id', 'project_id', 'action', 'created_at'],
            ],
        ]);
    }

    private function seedProjectTask(): array
    {
        $user = User::factory()->create();
        $project = Project::query()->create([
            'name' => 'Test Project',
            'code' => 'TP'.random_int(100, 999),
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
            'title' => 'Task 1',
            'status_id' => $status->id,
            'created_by' => $user->id,
        ]);

        return [$user, $task, $project];
    }
}
