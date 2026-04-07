<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Specialty extends Model
{
    protected $fillable = ['name', 'description', 'color'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_specialty')->withTimestamps();
    }

    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_specialty')->withTimestamps();
    }
}
