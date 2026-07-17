<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatSoftDeletion extends Model
{
    protected $fillable = [
        'conversation_id',
        'user_id',
        'action',
        'effect_at',
        'restored_at',
        'restored_by',
        'meta',
    ];

    protected $casts = [
        'effect_at' => 'datetime',
        'restored_at' => 'datetime',
        'meta' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class)->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function restoredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'restored_by');
    }

    public function scopePending($query)
    {
        return $query->whereNull('restored_at');
    }
}
