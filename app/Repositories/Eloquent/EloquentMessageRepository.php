<?php

namespace App\Repositories\Eloquent;

use App\Models\Message;
use App\Models\MessageEdit;
use App\Models\MessageRead;
use App\Models\Attachment;
use App\Repositories\Contracts\MessageRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EloquentMessageRepository implements MessageRepositoryInterface
{
    public function createMessage(int $conversationId, int $senderId, string $type, string $body, ?string $iv, ?int $replyToMessageId = null): Message
    {
        return Message::create([
            'conversation_id' => $conversationId,
            'sender_id' => $senderId,
            'reply_to_message_id' => $replyToMessageId,
            'type' => $type,
            'body' => $body,
            'iv' => $iv,
            'is_edited' => false,
            'is_deleted' => false,
        ]);
    }

    public function editMessage(int $messageId, string $newBody, ?string $newIv = null): Message
    {
        $message = Message::findOrFail($messageId);

        DB::transaction(function () use ($message, $newBody, $newIv) {
            MessageEdit::create([
                'message_id' => $message->id,
                'old_body' => $message->body,
                'new_body' => $newBody,
                'edited_at' => now(),
            ]);

            $updateData = [
                'body' => $newBody,
                'is_edited' => true,
            ];
            if ($newIv !== null) {
                $updateData['iv'] = $newIv;
            }

            $message->update($updateData);
        });

        return $message;
    }

    public function deleteForMe(int $messageId, int $userId): bool
    {
        // Deleting for me is handled locally on the client cache, 
        // but we can register it or simply return true here.
        return true;
    }

    public function deleteForEveryone(int $messageId): bool
    {
        $message = Message::findOrFail($messageId);
        
        // Delete all associated physical files and database attachment records
        foreach ($message->attachments as $attachment) {
            try {
                if (Storage::disk('local')->exists($attachment->file_path)) {
                    Storage::disk('local')->delete($attachment->file_path);
                }
            } catch (\Exception $e) {
                // Keep trying to clean up DB records even if disk actions error out
            }
            $attachment->delete();
        }

        return $message->delete();
    }

    public function getMessages(int $conversationId, int $limit = 50, ?int $beforeId = null, $clearedAt = null, ?int $sinceId = null): Collection
    {
        $query = Message::where('conversation_id', $conversationId)
            ->with(['sender', 'attachments', 'reads', 'conversation.conversationMembers', 'replyTo.sender']);

        // Pagination: load older messages (scroll up)
        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }

        // Delta sync: only load messages newer than the local cache's last known id
        if ($sinceId) {
            $query->where('id', '>', $sinceId);
        }

        if ($clearedAt) {
            $query->where('created_at', '>', $clearedAt);
        }

        return $query->orderBy('id', 'desc')->limit($limit)->get()->reverse()->values();
    }


    public function markAsDelivered(int $messageId, int $userId): bool
    {
        return MessageRead::updateOrCreate(
            ['message_id' => $messageId, 'user_id' => $userId],
            ['delivered_at' => now()]
        )->wasRecentlyCreated || true;
    }

    public function markAsRead(int $messageId, int $userId): bool
    {
        $record = MessageRead::where('message_id', $messageId)->where('user_id', $userId)->first();
        if ($record) {
            $record->update([
                'read_at' => now(),
                'delivered_at' => $record->delivered_at ?? now()
            ]);
            return true;
        }

        MessageRead::create([
            'message_id' => $messageId,
            'user_id' => $userId,
            'delivered_at' => now(),
            'read_at' => now()
        ]);
        return true;
    }

    public function addAttachment(int $messageId, array $fileData): Attachment
    {
        return Attachment::create(array_merge([
            'message_id' => $messageId,
        ], $fileData));
    }
}
