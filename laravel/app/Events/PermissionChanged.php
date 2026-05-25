<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PermissionChanged implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $affectedUser,
        public string $changeType, // role_changed | permission_granted | permission_revoked
        public array $details = [],
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.' . $this->affectedUser->id)];
    }

    public function broadcastAs(): string
    {
        return 'permission.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id'     => $this->affectedUser->id,
            'change_type' => $this->changeType,
            'details'     => $this->details,
        ];
    }
}
