<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SprintController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskStatusController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/', function () {
    return response()->json([
        'app' => 'Gestion Projets PFE',
        'version' => '1.0.0',
    ]);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Teams
    Route::apiResource('teams', TeamController::class);
    Route::post('teams/{team}/members', [TeamController::class, 'addMember']);
    Route::delete('teams/{team}/members/{user}', [TeamController::class, 'removeMember']);
    Route::middleware('check.role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
    });

    // Projects / Clients
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('projects', ProjectController::class);
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/dashboard', [ProjectController::class, 'dashboard']);
        Route::get('projects/{project}/activity', [ProjectController::class, 'activity']);
        Route::get('projects/{project}/members', [ProjectController::class, 'members']);
        Route::post('projects/{project}/invite', [ProjectController::class, 'invite']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::post('projects/{project}/members', [ProjectController::class, 'addMember']);
        Route::delete('projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);
        Route::post('projects/{project}/recalculate-costs', [ProjectController::class, 'recalculateCosts']);
    });

    // Sprints / Backlog
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/sprints', [SprintController::class, 'index']);
        Route::get('projects/{project}/backlog', [SprintController::class, 'backlog']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::post('projects/{project}/sprints', [SprintController::class, 'store']);
        Route::post('projects/{project}/sprints/{sprint}/start', [SprintController::class, 'start']);
        Route::post('projects/{project}/sprints/{sprint}/end', [SprintController::class, 'end']);
        Route::post('projects/{project}/sprints/{sprint}/tasks/{task}', [SprintController::class, 'assignTask']);
    });

    // Task Statuses (scoped to project)
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/statuses', [TaskStatusController::class, 'index']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::post('projects/{project}/statuses', [TaskStatusController::class, 'store']);
        Route::post('projects/{project}/statuses/reorder', [TaskStatusController::class, 'reorder']);
    });
    Route::put('statuses/{status}', [TaskStatusController::class, 'update']);
    Route::delete('statuses/{status}', [TaskStatusController::class, 'destroy']);

    Route::get('calendar', [CalendarController::class, 'index']);
    Route::get('gantt', [GanttController::class, 'globalIndex']);

    // Tasks (scoped to project)
    Route::get('tasks', [TaskController::class, 'globalIndex']);
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/tasks', [TaskController::class, 'index']);
    });
    Route::middleware('check.project:view')->group(function () {
        Route::post('projects/{project}/tasks', [TaskController::class, 'store']);
    });
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::put('tasks/{task}', [TaskController::class, 'update']);
    Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
    Route::patch('tasks/{task}/move', [TaskController::class, 'move']);

    // Task Assignees
    Route::get('tasks/{task}/assignees', [TaskController::class, 'assignees']);
    Route::post('tasks/{task}/assign', [TaskController::class, 'assign']);
    Route::delete('tasks/{task}/unassign/{user}', [TaskController::class, 'unassign']);

    // Task Dependencies
    Route::get('tasks/{task}/dependencies', [TaskController::class, 'dependencies']);
    Route::post('tasks/{task}/dependencies', [TaskController::class, 'addDependency']);
    Route::delete('tasks/{task}/dependencies/{dependency}', [TaskController::class, 'removeDependency']);

    // Task Comments
    Route::get('tasks/{task}/comments', [TaskController::class, 'comments']);
    Route::post('tasks/{task}/comments', [TaskController::class, 'addComment']);
    Route::delete('tasks/{task}/comments/{comment}', [TaskController::class, 'deleteComment']);

    // Task Attachments
    Route::get('tasks/{task}/attachments', [TaskController::class, 'attachments']);
    Route::post('tasks/{task}/attachments', [TaskController::class, 'addAttachment']);
    Route::delete('tasks/{task}/attachments/{attachment}', [TaskController::class, 'deleteAttachment']);

    // Task Time Entries
    Route::get('tasks/{task}/time-entries', [TaskController::class, 'timeEntries']);
    Route::post('tasks/{task}/time-entries', [TaskController::class, 'addTimeEntry']);
    Route::delete('tasks/{task}/time-entries/{timeEntry}', [TaskController::class, 'deleteTimeEntry']);

    // Gantt
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/gantt', [GanttController::class, 'show']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::put('projects/{project}/gantt', [GanttController::class, 'updateDates']);
    });

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // IA Services
    Route::prefix('ai')->group(function () {
        Route::get('estimate/{task}', [AiController::class, 'estimateTask']);
        Route::get('delay-risk/task/{task}', [AiController::class, 'delayRiskTask']);
        Route::get('delay-risk/project/{project}', [AiController::class, 'delayRiskProject']);
        Route::get('suggest-assignment/{task}', [AiController::class, 'suggestAssignment']);
        Route::get('optimize-assignments/{project}', [AiController::class, 'optimizeProjectAssignments']);
        Route::get('recommendations/project/{project}', [AiController::class, 'projectRecommendations']);
    });
});
