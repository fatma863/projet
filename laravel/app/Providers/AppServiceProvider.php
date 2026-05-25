<?php

namespace App\Providers;

use App\Events\PermissionChanged;
use App\Events\ProgressUpdated;
use App\Events\TaskAssignmentChanged;
use App\Events\TaskUpdated;
use App\Listeners\PermissionEventListener;
use App\Listeners\ProgressEventListener;
use App\Listeners\TaskEventListener;
use App\Models\Project;
use App\Models\Task;
use App\Policies\ProjectPolicy;
use App\Policies\TaskPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // No service bindings required; all setup is handled in boot().
    }

    public function boot(): void
    {
        App::setLocale(config('app.locale'));

        // ── Event → Notification listeners ────────────────────────────────
        Event::listen(TaskUpdated::class, [TaskEventListener::class, 'handleTaskUpdated']);
        Event::listen(TaskAssignmentChanged::class, [TaskEventListener::class, 'handleTaskAssignmentChanged']);
        Event::listen(PermissionChanged::class, [PermissionEventListener::class, 'handle']);
        Event::listen(ProgressUpdated::class, [ProgressEventListener::class, 'handle']);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $base = config('app.frontend_url', config('app.url'));
            $email = urlencode((string) $notifiable->getEmailForPasswordReset());

            return "{$base}/reset-password?token={$token}&email={$email}";
        });

        if (Schema::hasTable('roles')) {
            Role::findOrCreate('admin', 'web');
            Role::findOrCreate('member', 'web');
            Role::findOrCreate('client', 'web');
        }

        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
    }
}
