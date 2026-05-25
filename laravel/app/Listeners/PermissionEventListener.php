<?php

namespace App\Listeners;

use App\Events\PermissionChanged;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class PermissionEventListener implements ShouldQueue
{
    public string $queue = 'notifications';

    public function __construct(private NotificationService $notificationService) {}

    public function handle(PermissionChanged $event): void
    {
        $this->notificationService->notifyPermissionUpdated(
            $event->affectedUser,
            null,   // actor not in this event; details carry the info
            array_merge(['change_type' => $event->changeType], $event->details),
        );
    }
}
