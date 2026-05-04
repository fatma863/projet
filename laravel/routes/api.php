<?php

use App\Http\Controllers\Api\ActivityFeedController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\MLController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SpecialtyController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ClientDashboardController;
use App\Http\Controllers\Api\CriticalPathController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\InviteController;
use App\Http\Controllers\Api\MemberDashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SprintController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskStatusController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\GlobalSearchController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationPreferencesController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/', function () {
    return response()->json([
        'app' => 'Gestion Projets PFE',
        'version' => '1.0.0',
    ]);
});

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

Route::get('invitations/verify', [InvitationController::class, 'verify']);

Route::get('invites/{token}', [InviteController::class, 'show'])
    ->where('token', '[A-Za-z0-9\-]+');

// Protected routes
Route::middleware(['auth:sanctum', 'active.user', 'throttle:60,1'])->group(function () {
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/me/preferences', [AuthController::class, 'preferences']);
    Route::put('/me', [AuthController::class, 'updateMe']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar']);
    Route::patch('/me/preferences', [AuthController::class, 'updatePreferences']);
    Route::put('/user/preferences', [AuthController::class, 'updatePreferences']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout-all-devices', [AuthController::class, 'logoutAllDevices']);
    Route::get('/notifications/preferences', [NotificationPreferencesController::class, 'show']);
    Route::put('/notifications/preferences', [NotificationPreferencesController::class, 'update']);

    Route::get('search', GlobalSearchController::class);

    Route::get('invitations/pending', [InvitationController::class, 'pending']);
    Route::get('my-invites', [InvitationController::class, 'pending']);
    Route::post('invitations/{token}/accept', [InvitationController::class, 'accept']);
    Route::post('invitations/{token}/decline', [InvitationController::class, 'decline']);

    Route::get('member/dashboard', [MemberDashboardController::class, 'index']);
    Route::get('member/dashboard/summary', [MemberDashboardController::class, 'summary']);
    Route::middleware('check.role:admin')->group(function () {
        Route::get('admin/dashboard', [AdminDashboardController::class, 'index']);
    });

    Route::post('invites', [InviteController::class, 'store']);
    Route::post('invites/accept', [InviteController::class, 'accept']);
    Route::post('invites/decline', [InviteController::class, 'decline']);

    // Teams
    Route::apiResource('teams', TeamController::class);
    Route::post('teams/{team}/members', [TeamController::class, 'addMember']);
    Route::patch('teams/{team}/members/{user}', [TeamController::class, 'updateMember']);
    Route::patch('teams/{team}/members/{user}/project-role', [TeamController::class, 'updateMemberProjectRole']);
    Route::patch('teams/{team}/members/{user}/specialties', [TeamController::class, 'updateMemberSpecialties']);
    Route::delete('teams/{team}/members/{user}', [TeamController::class, 'removeMember']);
    Route::middleware('check.role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->except(['show']);
    });

    // Projects / Clients
    Route::middleware('check.role:admin,member')->group(function () {
        Route::apiResource('clients', ClientController::class);
    });
    Route::apiResource('projects', ProjectController::class);
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/dashboard', [ProjectController::class, 'dashboard']);
        Route::get('projects/{project}/activity', [ProjectController::class, 'activity']);
        Route::get('projects/{project}/members', [ProjectController::class, 'members']);
        Route::get('projects/{project}/critical-path', [CriticalPathController::class, 'index']);
        Route::post('projects/{project}/invite', [ProjectController::class, 'invite']);
        Route::get('projects/{project}/export/tasks', [ProjectController::class, 'exportTasks']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::get('projects/{project}/user-search', [ProjectController::class, 'searchUsers']);
        Route::post('projects/{project}/members', [ProjectController::class, 'addMember']);
        Route::delete('projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);
        Route::put('projects/{project}/change-chef', [ProjectController::class, 'changeChef']);
    });

    // Sprints / Backlog
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/sprints', [SprintController::class, 'index']);
        Route::get('projects/{project}/backlog', [SprintController::class, 'backlog']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::post('projects/{project}/sprints', [SprintController::class, 'store']);
        Route::put('projects/{project}/sprints/{sprint}', [SprintController::class, 'update']);
        Route::delete('projects/{project}/sprints/{sprint}', [SprintController::class, 'destroy']);
        Route::post('projects/{project}/sprints/{sprint}/start', [SprintController::class, 'start']);
        Route::post('projects/{project}/sprints/{sprint}/end', [SprintController::class, 'end']);
        Route::post('projects/{project}/sprints/{sprint}/complete', [SprintController::class, 'complete']);
        Route::patch('projects/{project}/backlog/reorder', [SprintController::class, 'reorderBacklog']);
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

    Route::middleware('check.role:admin,member')->group(function () {
        Route::get('calendar', [CalendarController::class, 'index']);
        Route::get('gantt', [GanttController::class, 'globalIndex']);
        Route::get('activity/feed', [ActivityFeedController::class, 'index']);
    });

    // Tasks (scoped to project)
    Route::get('tasks', [TaskController::class, 'globalIndex']);
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/tasks', [TaskController::class, 'index']);
    });
    Route::middleware('check.project:edit')->group(function () {
        Route::post('projects/{project}/tasks', [TaskController::class, 'store']);
    });
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::put('tasks/{task}', [TaskController::class, 'update'])->middleware('can:update,task');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->middleware('can:delete,task');
    Route::patch('tasks/{task}/move', [TaskController::class, 'move'])->middleware('can:update,task');

    // Task Assignees
    Route::get('tasks/{task}/assignees', [TaskController::class, 'assignees']);
    Route::post('tasks/{task}/assign', [TaskController::class, 'assign'])->middleware('can:update,task');
    Route::delete('tasks/{task}/unassign/{user}', [TaskController::class, 'unassign'])->middleware('can:update,task');

    // Task Dependencies
    Route::get('tasks/{task}/dependencies', [TaskController::class, 'dependencies']);
    Route::post('tasks/{task}/dependencies', [TaskController::class, 'addDependency']);
    Route::delete('tasks/{task}/dependencies/{dependency}', [TaskController::class, 'removeDependency']);

    // Task Comments
    Route::get('tasks/{task}/comments', [TaskController::class, 'comments']);
    Route::post('tasks/{task}/comments', [TaskController::class, 'addComment']);
    Route::put('tasks/{task}/comments/{comment}', [TaskController::class, 'updateComment']);
    Route::delete('tasks/{task}/comments/{comment}', [TaskController::class, 'deleteComment']);

    // Task Attachments
    Route::get('tasks/{task}/attachments', [TaskController::class, 'attachments']);
    Route::get('tasks/{task}/attachments/{attachment}/download', [TaskController::class, 'downloadAttachment']);
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

    // ── Spécialités ───────────────────────────────────────────────────────────
    Route::get('specialties', [SpecialtyController::class, 'index']);
    Route::middleware('check.project:view')->group(function () {
        Route::get('projects/{project}/auto-assign',          [SpecialtyController::class, 'autoAssign']);
        Route::get('projects/{project}/members-performance',  [SpecialtyController::class, 'membersPerformance']);
    });
    Route::get('me/specialties', [SpecialtyController::class, 'mySpecialties']);
    Route::put('me/specialties', [SpecialtyController::class, 'syncMySpecialties']);
    Route::get('tasks/{task}/matching-members', [SpecialtyController::class, 'matchingMembers']);
    Route::middleware('check.role:admin')->group(function () {
        Route::post('specialties', [SpecialtyController::class, 'store']);
        Route::put('specialties/{specialty}', [SpecialtyController::class, 'update']);
        Route::delete('specialties/{specialty}', [SpecialtyController::class, 'destroy']);
    });

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/summary', [NotificationController::class, 'summary']);
    Route::post('notifications/read', [NotificationController::class, 'markReadFromBody']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // ML Recommendation Engine (members & admins)
    Route::middleware('check.role:admin,member')->group(function () {
        Route::prefix('ml')->group(function () {
            Route::post('recommend',             [MLController::class, 'recommendForNewTask']);
            Route::get('recommend/{task}',       [MLController::class, 'recommend']);
            Route::get('model-info',             [MLController::class, 'modelInfo']);
            Route::post('feedback/{task}',       [MLController::class, 'recordOutcome']);
        });
        Route::middleware('check.role:admin')->group(function () {
            Route::post('ml/retrain', [MLController::class, 'retrain']);
        });
    });

    // IA Services (membres & admins — pas les invités applicatifs `viewer`)
    Route::middleware('check.role:admin,member')->group(function () {
        Route::prefix('ai')->group(function () {
            Route::get('estimate/{task}', [AiController::class, 'estimateTask']);
            Route::get('delay-risk/task/{task}', [AiController::class, 'delayRiskTask']);
            Route::get('delay-risk/project/{project}', [AiController::class, 'delayRiskProject']);
            Route::get('suggest-assignment/{task}', [AiController::class, 'suggestAssignment']);
            Route::get('optimize-assignments/{project}', [AiController::class, 'optimizeProjectAssignments']);
            Route::get('recommendations/project/{project}', [AiController::class, 'projectRecommendations']);
            Route::get('workload-balance/{project}', [AiController::class, 'workloadBalance']);
            Route::post('chat', [AiController::class, 'chat']);
        });
    });

    // ── Client / Viewer : rapports lecture seule ──────────────────────────────
    Route::middleware('check.project:view')->group(function () {
        Route::get('client/projects/{project}/report', [ClientDashboardController::class, 'projectReport']);
        // AI en lecture seule pour le client (risques projet + recommandations)
        Route::get('client/projects/{project}/ai/risk', [AiController::class, 'delayRiskProject']);
        Route::get('client/projects/{project}/ai/recommendations', [AiController::class, 'projectRecommendations']);
    });
});
