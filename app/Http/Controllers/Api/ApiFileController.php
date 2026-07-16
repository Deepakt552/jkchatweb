<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FileService;
use App\Repositories\Contracts\MessageRepositoryInterface;
use Illuminate\Http\Request;

class ApiFileController extends Controller
{
    protected FileService $fileService;
    protected MessageRepositoryInterface $messageRepository;

    public function __construct(
        FileService $fileService,
        MessageRepositoryInterface $messageRepository
    ) {
        $this->fileService = $fileService;
        $this->messageRepository = $messageRepository;
    }

    public function uploadChunk(Request $request)
    {
        $request->validate([
            'chunk' => 'required|file',
            'chunk_index' => 'required|integer',
            'total_chunks' => 'required|integer',
            'upload_id' => 'required|string',
            'file_name' => 'required|string',
            'message_id' => 'required|integer',
            // Decryption info (E2EE)
            'encryption_iv' => 'required|string',
            'encryption_key' => 'nullable|string', // encrypted file key
        ]);

        $userId = $request->user()->id;

        // Secure check: verify the message belongs to this user
        $message = \App\Models\Message::findOrFail($request->message_id);
        if ($message->sender_id !== $userId) {
            return response()->json(['message' => 'Unauthorized message attachment.'], 403);
        }

        $file = $request->file('chunk');

        $finalPath = $this->fileService->handleChunkUpload(
            $userId,
            $request->upload_id,
            $file,
            $request->chunk_index,
            $request->total_chunks,
            $request->file_name
        );

        if ($finalPath) {
            // Merging complete, create attachment model linked to message
            $fileMime = mime_content_type(storage_path('app/private/' . $finalPath)) ?: 'application/octet-stream';
            $fileSize = filesize(storage_path('app/private/' . $finalPath));

            // Determine file type category
            $ext = strtolower(pathinfo($request->file_name, PATHINFO_EXTENSION));
            $fileType = 'document';
            if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'])) {
                $fileType = 'image';
            } elseif (in_array($ext, ['mp4', 'mov', 'avi'])) {
                $fileType = 'video';
            } elseif (in_array($ext, ['mp3', 'wav', 'm4a'])) {
                $fileType = 'audio';
            }

            $attachment = $this->messageRepository->addAttachment($request->message_id, [
                'file_path' => $finalPath,
                'file_name' => $request->file_name,
                'file_size' => $fileSize,
                'file_mime' => $fileMime,
                'file_type' => $fileType,
                'encryption_iv' => $request->encryption_iv,
                'encryption_key' => $request->encryption_key,
            ]);

            return response()->json([
                'status' => 'completed',
                'attachment' => $attachment,
            ]);
        }

        return response()->json([
            'status' => 'uploading',
            'chunk_index' => $request->chunk_index,
        ]);
    }

    public function download(Request $request, $attachmentId)
    {
        return $this->fileService->downloadAttachment($request->user()->id, (int)$attachmentId);
    }
}
