<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageEdit extends Model
{
    protected $table = 'message_edits';
    public $timestamps = false;

    protected $fillable = [
        'message_id',
        'old_body',
        'new_body',
        'edited_at',
    ];

    protected $casts = [
        'edited_at' => 'datetime',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
