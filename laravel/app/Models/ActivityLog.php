<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'project_id',
        'actor_id',
        'entity_type',
        'entity_id',
        'action',
        'meta',
        'old_values',
        'new_values',
        'changed_fields',
        'ip_address',
        'user_agent',
        'severity',
        'source',
        'actor_role',
    ];

    protected function casts(): array
    {
        return [
            'meta'           => 'array',
            'old_values'     => 'array',
            'new_values'     => 'array',
            'changed_fields' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }
}
