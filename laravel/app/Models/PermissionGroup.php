<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Permission;

class PermissionGroup extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'icon', 'color', 'order'];

    public function permissions()
    {
        return $this->hasMany(Permission::class, 'group_id');
    }
}
