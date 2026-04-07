<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $message = $this->message
            ?? data_get($this->data, 'message')
            ?? data_get($this->data, 'title')
            ?? '';

        return [
            'id' => $this->id,
            'type' => $this->type,
            'message' => $message,
            'severity' => $this->severity ?? 'info',
            'data' => $this->data,
            'read' => $this->read_at !== null,
            'is_read' => $this->read_at !== null,
            'related_task_id' => $this->related_task_id,
            'read_at' => $this->read_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
