<?php

namespace App\Services;

use App\Models\User;
use App\Models\Backup;
use App\Models\BackupVersion;
use App\Models\Message;
use App\Models\Friend;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class BackupService
{
    /**
     * Backup contains messages, friends, settings metadata.
     * The backup content itself is encrypted client-side or server-side.
     * We'll compile the data into a JSON structure, sign/encrypt, and store it.
     */
    public function createBackup(int $userId, string $encryptedData, string $checksum): Backup
    {
        $fileName = "backups/{$userId}/backup_" . now()->timestamp . ".bin";
        
        // Save the raw encrypted binary payload
        Storage::disk('local')->put($fileName, $encryptedData);

        $size = Storage::disk('local')->size($fileName);

        $backup = Backup::create([
            'user_id' => $userId,
            'file_path' => $fileName,
            'size' => $size,
            'checksum' => $checksum,
            'status' => 'success',
        ]);

        BackupVersion::create([
            'backup_id' => $backup->id,
            'version' => '1.0.0',
            'notes' => 'Encrypted system sync archive',
        ]);

        return $backup;
    }

    public function getBackupContent(int $userId, int $backupId): string
    {
        $backup = Backup::where('user_id', $userId)->findOrFail($backupId);

        if (!Storage::disk('local')->exists($backup->file_path)) {
            throw ValidationException::withMessages([
                'backup_id' => ['Backup archive file missing on storage.'],
            ]);
        }

        return Storage::disk('local')->get($backup->file_path);
    }

    public function deleteBackup(int $userId, int $backupId): bool
    {
        $backup = Backup::where('user_id', $userId)->findOrFail($backupId);
        
        if (Storage::disk('local')->exists($backup->file_path)) {
            Storage::disk('local')->delete($backup->file_path);
        }

        return $backup->delete();
    }
}
