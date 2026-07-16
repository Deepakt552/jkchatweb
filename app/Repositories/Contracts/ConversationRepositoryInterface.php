<?php

namespace App\Repositories\Contracts;

use App\Models\Conversation;
use Illuminate\Support\Collection;

interface ConversationRepositoryInterface
{
    public function findOrCreateDirectConversation(int $user1, int $user2): Conversation;
    public function createGroupConversation(string $name, int $creatorId, array $memberIds): Conversation;
    public function getUserConversations(int $userId, ?string $since = null): Collection;
    public function getConversationMembers(int $conversationId): Collection;
    public function addMember(int $conversationId, int $userId, string $role = 'member'): bool;
    public function removeMember(int $conversationId, int $userId): bool;
    public function updateLastRead(int $conversationId, int $userId, int $messageId): bool;
}
