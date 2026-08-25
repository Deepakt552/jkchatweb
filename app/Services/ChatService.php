<?php

namespace App\Services;

use App\Models\Message;
use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Repositories\Contracts\MessageRepositoryInterface;
use App\Repositories\Contracts\ConversationRepositoryInterface;
use App\Repositories\Contracts\FriendRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use App\Events\MessageSent;
use App\Events\MessageEdited;
use App\Events\MessageDeleted;
use App\Events\MessageRead;
use App\Events\TypingIndicator;
use App\Jobs\SendMessagePushNotification;

class ChatService
{
    protected MessageRepositoryInterface $messageRepository;
    protected ConversationRepositoryInterface $conversationRepository;
    protected FriendRepositoryInterface $friendRepository;

    public function __construct(
        MessageRepositoryInterface $messageRepository,
        ConversationRepositoryInterface $conversationRepository,
        FriendRepositoryInterface $friendRepository
    ) {
        $this->messageRepository = $messageRepository;
        $this->conversationRepository = $conversationRepository;
        $this->friendRepository = $friendRepository;
    }

    public function getConversations(int $userId, ?string $since = null): Collection
    {
        return $this->conversationRepository->getUserConversations($userId, $since);
    }

    public function getMessages(int $conversationId, int $userId, int $limit = 50, ?int $beforeId = null, ?int $sinceId = null): Collection
    {
        // Verify user is a member of conversation
        $member = ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            throw ValidationException::withMessages([
                'conversation_id' => ['Unauthorized conversation access.'],
            ]);
        }

        $messages = $this->messageRepository->getMessages($conversationId, $limit, $beforeId, $member->cleared_at, $sinceId);

        // Auto-mark un-delivered incoming messages as delivered for this user
        foreach ($messages as $msg) {
            if ($msg->sender_id !== $userId) {
                $hasDelivered = $msg->reads && $msg->reads->where('user_id', $userId)->whereNotNull('delivered_at')->isNotEmpty();
                if (!$hasDelivered) {
                    try {
                        $this->messageRepository->markAsDelivered($msg->id, $userId);
                        broadcast(new MessageRead($msg->id, $userId, 'delivered', $conversationId))->toOthers();
                    } catch (\Throwable $e) {
                        // Suppress individual delivery receipt errors
                    }
                }
            }
        }

        return $messages;
    }

    public function sendMessage(int $senderId, int $conversationId, string $type, string $body, ?string $iv, ?int $replyToMessageId = null, ?string $clientId = null): Message
    {
        // Validate conversation membership
        $members = ConversationMember::where('conversation_id', $conversationId)->pluck('user_id')->toArray();
        if (!in_array($senderId, $members)) {
            throw ValidationException::withMessages([
                'conversation_id' => ['Sender is not a member of this conversation.'],
            ]);
        }

        // Rapid duplicate prevention (idempotency guard: within 4 seconds with identical body & type)
        $recentDuplicate = Message::where('conversation_id', $conversationId)
            ->where('sender_id', $senderId)
            ->where('type', $type)
            ->where('body', $body)
            ->where('created_at', '>=', now()->subSeconds(4))
            ->first();

        if ($recentDuplicate) {
            return $recentDuplicate;
        }

        $conversation = Conversation::findOrFail($conversationId);

        // Enforce group message permissions
        if ($conversation->type === 'group' && ($conversation->message_permissions ?? 'all') === 'admins') {
            $senderMember = ConversationMember::where('conversation_id', $conversationId)
                ->where('user_id', $senderId)
                ->first();
            if (!$senderMember || $senderMember->role !== 'admin') {
                throw ValidationException::withMessages([
                    'conversation_id' => ['Only group admins can send messages in this group.'],
                ]);
            }
        }

        // WhatsApp-style block check for direct conversations:
        // Senders can send messages, but if either party has blocked the other,
        // the message is not delivered/pushed to the other party (stays single-tick sent).
        $isBlocked = false;
        if ($conversation->type === 'direct') {
            $otherUserId = collect($members)->first(fn($id) => $id !== $senderId);
            if ($otherUserId) {
                $isBlocked = $this->friendRepository->isBlocked($senderId, $otherUserId)
                    || $this->friendRepository->isBlocked($otherUserId, $senderId);
            }
        }

        $message = $this->messageRepository->createMessage($conversationId, $senderId, $type, $body, $iv, $replyToMessageId);

        if (!$isBlocked) {
            // Send to real-time broadcaster (in-app delivery via Reverb WebSocket)
            broadcast(new MessageSent($message))->toOthers();

            // Dispatch job to send FCM push notification immediately after response
            SendMessagePushNotification::dispatchAfterResponse(
                $message->id,
                $conversationId,
                $senderId,
                $message->sender->name ?? 'Unknown',
                $message->body ?? 'New message',
                $message->type ?? 'text',
                $message->iv,
            );
        }

        return $message;
    }

    public function editMessage(int $userId, int $messageId, string $newBody, ?string $newIv = null): Message
    {
        $message = Message::findOrFail($messageId);
        if ($message->sender_id !== $userId) {
            throw ValidationException::withMessages([
                'message_id' => ['You can only edit your own messages.'],
            ]);
        }

        $editedMessage = $this->messageRepository->editMessage($messageId, $newBody, $newIv);

        broadcast(new MessageEdited($editedMessage))->toOthers();

        return $editedMessage;
    }

    public function deleteMessage(int $userId, int $messageId, bool $forEveryone): bool
    {
        $message = Message::findOrFail($messageId);

        if ($forEveryone) {
            if ($message->sender_id !== $userId) {
                throw ValidationException::withMessages([
                    'message_id' => ['You can only delete messages for everyone if you are the sender.'],
                ]);
            }
            $originalBody = $message->body;
            $result = $this->messageRepository->deleteForEveryone($messageId);

            // Create soft deletion log for Admin Chat Monitor
            \App\Models\ChatSoftDeletion::create([
                'conversation_id' => $message->conversation_id,
                'user_id' => $userId,
                'action' => 'delete',
                'effect_at' => now(),
                'meta' => [
                    'message_id' => $messageId,
                    'type' => 'message_soft_delete',
                    'original_body' => $originalBody,
                ],
            ]);

            \App\Models\AuditLog::create([
                'user_id' => $userId,
                'action' => 'message.delete_soft_everyone',
                'resource_type' => 'message',
                'resource_id' => (string) $messageId,
                'old_values' => ['body' => $originalBody],
                'new_values' => ['is_deleted' => true],
                'ip_address' => request()->ip() ?? '0.0.0.0',
                'user_agent' => request()->userAgent(),
                'created_at' => now(),
            ]);

            broadcast(new MessageDeleted($messageId, $message->conversation_id))->toOthers();
            return $result;
        }

        return $this->messageRepository->deleteForMe($messageId, $userId);
    }

    public function markMessageAsRead(int $userId, int $messageId): bool
    {
        $message = Message::findOrFail($messageId);
        $result = $this->messageRepository->markAsRead($messageId, $userId);

        broadcast(new MessageRead($messageId, $userId, 'read', $message->conversation_id))->toOthers();

        return $result;
    }

    public function markMessageAsDelivered(int $userId, int $messageId): bool
    {
        $message = Message::findOrFail($messageId);
        $result = $this->messageRepository->markAsDelivered($messageId, $userId);

        broadcast(new MessageRead($messageId, $userId, 'delivered', $message->conversation_id))->toOthers();

        return $result;
    }

    public function sendTypingIndicator(int $userId, int $conversationId, bool $isTyping): void
    {
        broadcast(new TypingIndicator($userId, $conversationId, $isTyping))->toOthers();
    }
}
