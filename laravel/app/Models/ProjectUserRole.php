<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role;

class ProjectUserRole extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'role_id',
        'granted_permissions',
        'denied_permissions',
        'assigned_by',
    ];

    protected $casts = [
        'granted_permissions' => 'array',
        'denied_permissions'  => 'array',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
