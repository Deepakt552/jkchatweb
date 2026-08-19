<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Device extends Model
{
    protected $fillable = [
        'user_id',
        'device_identifier',
        'hardware_id',
        'ip_address',
        'user_agent',
        'name',
        'device_model',
        'brand',
        'token',
        'os',
        'os_version',
        'is_verified',
        'last_active_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'last_active_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
