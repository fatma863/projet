<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PermissionAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'performed_by',
        'target_type',
        'target_id',
        'action',
        'permission_name',
        'context',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'context'    => 'array',
        'created_at' => 'datetime',
    ];

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public static function record(
        string $targetType,
        int $targetId,
        string $action,
        ?string $permissionName = null,
        ?array $context = null,
        ?int $performedBy = null,
        ?string $ipAddress = null,
    ): void {
        static::create([
            'performed_by'    => $performedBy ?? auth()->id(),
            'target_type'     => $targetType,
            'target_id'       => $targetId,
            'action'          => $action,
            'permission_name' => $permissionName,
            'context'         => $context,
            'ip_address'      => $ipAddress ?? request()?->ip(),
            'created_at'      => now(),
        ]);
    }
}
