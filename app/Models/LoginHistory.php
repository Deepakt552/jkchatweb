<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginHistory extends Model
{
    protected $table = 'login_history';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'username_or_email',
        'ip_address',
        'user_agent',
        'location',
        'status',
        'failed_reason',
        'login_at',
    ];

    protected $casts = [
        'login_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
