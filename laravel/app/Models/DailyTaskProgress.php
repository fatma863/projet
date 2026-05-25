<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyTaskProgress extends Model
{
    protected $table = 'daily_task_progress';

    protected $fillable = [
        'task_id',
        'user_id',
        'date',
        'worked_minutes',
        'progress_delta',
        'user_progress',
        'note',
    ];

    protected $casts = [
        'date'           => 'date',
        'worked_minutes' => 'integer',
        'progress_delta' => 'integer',
        'user_progress'  => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getWorkedHoursAttribute(): float
    {
        return round($this->worked_minutes / 60, 2);
    }
}
