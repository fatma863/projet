<?php

use App\Mail\ProjectInvitationMail;
use App\Mail\TaskNotificationMail;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dev/email-preview/{type?}', function (?string $type = null) {
    $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

    if ($type === 'notification') {
        return (new TaskNotificationMail(
            subjectLine: 'Une tâche vous a été assignée',
            title: 'Une tâche vous a été assignée',
            message: 'La tâche "Finaliser la maquette UI" a été assignée à votre compte.',
            ctaLabel: 'Voir la tâche',
            ctaUrl: "{$frontend}/projects/4?highlightTask=12",
            payload: [
                'project_id' => 4,
                'project_name' => 'Gestion PFE',
                'task_id' => 12,
                'task_name' => 'Finaliser la maquette UI',
            ],
        ))->render();
    }

    return (new ProjectInvitationMail(
        inviteeName: 'Iyed',
        inviterName: 'Fatma',
        projectName: 'Gestion PFE',
        roleLabel: 'Membre',
        acceptUrl: "{$frontend}/accept-invite?token=preview-token-123",
    ))->render();
});
