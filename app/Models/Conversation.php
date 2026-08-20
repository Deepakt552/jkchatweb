<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'avatar_url',
        'description',
        'encryption_key_hash',
        'deleted_by',
        'delete_reason',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['creator'];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_members')
                    ->withPivot('role', 'joined_at', 'last_read_message_id', 'cleared_at', 'hidden_at')
                    ->withTimestamps();
    }

    public function conversationMembers(): HasMany
    {
        return $this->hasMany(ConversationMember::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function deletedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function softDeletions(): HasMany
    {
        return $this->hasMany(ChatSoftDeletion::class);
    }

    /**
     * Return the admin/creator member for group conversations.
     */
    public function getCreatorAttribute(): ?array
    {
        if ($this->type !== 'group') return null;
        $admin = $this->members->firstWhere('pivot.role', 'admin');
        if (!$admin) return null;
        return [
            'id'   => $admin->id,
            'name' => $admin->name,
        ];
    }
}
