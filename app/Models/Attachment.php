<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attachment extends Model
{
    protected $fillable = [
        'message_id',
        'file_path',
        'file_name',
        'file_size',
        'file_mime',
        'file_type',
        'encryption_iv',
        'encryption_key',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
