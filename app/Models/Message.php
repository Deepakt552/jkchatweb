<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'reply_to_message_id',
        'type',
        'body',
        'iv',
        'is_edited',
        'is_deleted',
    ];

    protected $casts = [
        'is_edited' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    protected $appends = ['read_by', 'delivered_by', 'status'];

    public function getReadByAttribute(): array
    {
        // Safe check if reads relation is loaded
        if (!$this->relationLoaded('reads')) {
            return [];
        }
        return $this->reads->whereNotNull('read_at')->pluck('user_id')->toArray();
    }

    public function getDeliveredByAttribute(): array
    {
        // Safe check if reads relation is loaded
        if (!$this->relationLoaded('reads')) {
            return [];
        }
        return $this->reads->whereNotNull('delivered_at')->pluck('user_id')->toArray();
    }

    public function getStatusAttribute(): string
    {
        // Safe check if conversation and reads relations are loaded
        if (!$this->relationLoaded('conversation') || !$this->relationLoaded('reads')) {
            return 'sent';
        }
        
        $recipients = $this->conversation->conversationMembers
            ? $this->conversation->conversationMembers->where('user_id', '!=', $this->sender_id)->pluck('user_id')->toArray()
            : [];

        if (empty($recipients)) {
            return 'sent';
        }

        $reads = $this->reads;
        $readCount = 0;
        $deliveredCount = 0;

        foreach ($recipients as $recipientId) {
            $readRecord = $reads->firstWhere('user_id', $recipientId);
            if ($readRecord) {
                if ($readRecord->read_at) {
                    $readCount++;
                    $deliveredCount++;
                } elseif ($readRecord->delivered_at) {
                    $deliveredCount++;
                }
            }
        }

        if ($readCount === count($recipients)) {
            return 'read';
        }

        if ($deliveredCount === count($recipients)) {
            return 'delivered';
        }

        return 'sent';
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_message_id');
    }

    public function edits(): HasMany
    {
        return $this->hasMany(MessageEdit::class);
    }

    public function reads(): HasMany
    {
        return $this->hasMany(MessageRead::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }
}
