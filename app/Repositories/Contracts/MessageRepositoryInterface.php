<?php

namespace App\Repositories\Contracts;

use App\Models\Message;
use App\Models\Attachment;
use Illuminate\Support\Collection;

interface MessageRepositoryInterface
{
    public function createMessage(int $conversationId, int $senderId, string $type, string $body, ?string $iv, ?int $replyToMessageId = null): Message;
    public function editMessage(int $messageId, string $newBody): Message;
    public function deleteForMe(int $messageId, int $userId): bool;
    public function deleteForEveryone(int $messageId): bool;
    public function getMessages(int $conversationId, int $limit = 50, ?int $beforeId = null, $clearedAt = null): Collection;
    public function markAsDelivered(int $messageId, int $userId): bool;
    public function markAsRead(int $messageId, int $userId): bool;
    public function addAttachment(int $messageId, array $fileData): Attachment;
}
