<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupVersion extends Model
{
    protected $table = 'backup_versions';

    protected $fillable = [
        'backup_id',
        'version',
        'notes',
    ];

    public function backup(): BelongsTo
    {
        return $this->belongsTo(Backup::class);
    }
}
