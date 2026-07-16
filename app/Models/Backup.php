<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    protected $fillable = [
        'user_id',
        'file_path',
        'size',
        'checksum',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(BackupVersion::class);
    }
}
