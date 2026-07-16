<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Conversation extends Model
{
    protected $fillable = [
        'name',
        'type',
        'avatar_url',
        'description',
        'encryption_key_hash',
    ];

    protected $appends = ['creator'];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_members')
                    ->withPivot('role', 'joined_at', 'last_read_message_id')
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
