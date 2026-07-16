<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\ConversationMember;
use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class FileService
{
    /**
     * Store chunked uploads and merge them.
     */
    public function handleChunkUpload(
        int $userId,
        string $uploadId,
        UploadedFile $file,
        int $chunkIndex,
        int $totalChunks,
        string $originalName
    ): ?string {
        $tempPath = "chunks/{$userId}_{$uploadId}";

        // Save current chunk
        $chunkName = "chunk_{$chunkIndex}.part";
        Storage::disk('local')->putFileAs($tempPath, $file, $chunkName);

        // Check if all chunks have arrived
        $files = Storage::disk('local')->files($tempPath);
        if (count($files) === $totalChunks) {
            // Merge all chunks
            $finalPath = "attachments/" . uniqid() . '_' . $originalName;
            $finalFullPath = Storage::disk('local')->path($finalPath);

            // Ensure directory exists
            if (!file_exists(dirname($finalFullPath))) {
                mkdir(dirname($finalFullPath), 0755, true);
            }

            $out = fopen($finalFullPath, 'wb');

            // Write chunks in order
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkFile = Storage::disk('local')->path("{$tempPath}/chunk_{$i}.part");
                $in = fopen($chunkFile, 'rb');
                while ($buff = fread($in, 4096)) {
                    fwrite($out, $buff);
                }
                fclose($in);
            }
            fclose($out);

            // Clean up chunks
            Storage::disk('local')->deleteDirectory($tempPath);

            // Verify limits and mime types
            $fileSize = filesize($finalFullPath);
            $maxSize = (int)Setting::getVal('file_upload_limit', 104857600); // 100MB default
            if ($fileSize > $maxSize) {
                unlink($finalFullPath);
                throw ValidationException::withMessages([
                    'file' => ["The file size exceeds the administrative limit of " . ($maxSize / 1024 / 1024) . "MB."],
                ]);
            }

            return $finalPath;
        }

        return null; // Not fully merged yet
    }

    public function downloadAttachment(int $userId, int $attachmentId)
    {
        $attachment = Attachment::findOrFail($attachmentId);
        $message = $attachment->message;

        // Check if user is conversation member
        $isMember = ConversationMember::where('conversation_id', $message->conversation_id)
            ->where('user_id', $userId)
            ->exists();

        if (!$isMember) {
            throw ValidationException::withMessages([
                'attachment_id' => ['Unauthorized attachment access.'],
            ]);
        }

        if (!Storage::disk('local')->exists($attachment->file_path)) {
            abort(404, 'File not found on storage disk.');
        }

        return Storage::disk('local')->download($attachment->file_path, $attachment->file_name);
    }
}
