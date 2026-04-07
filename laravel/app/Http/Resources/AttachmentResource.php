<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'type' => $this->type,
            'url' => $this->type === 'link' ? $this->path_or_url : null,
            'download_url' => $this->type === 'file'
                ? "/api/tasks/{$this->task_id}/attachments/{$this->id}/download"
                : null,
            'filename' => $this->filename,
            'mime' => $this->mime,
            'size' => $this->size,
            'is_previewable' => $this->type === 'file'
                && $this->mime
                && str_starts_with((string) $this->mime, 'image/'),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
