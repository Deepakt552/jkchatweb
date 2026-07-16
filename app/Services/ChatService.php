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

        return $this->messageRepository->getMessages($conversationId, $limit, $beforeId, $member->cleared_at, $sinceId);
    }

    public function sendMessage(int $senderId, int $conversationId, string $type, string $body, ?string $iv, ?int $replyToMessageId = null): Message
    {
        // Validate conversation membership
        $members = ConversationMember::where('conversation_id', $conversationId)->pluck('user_id')->toArray();
        if (!in_array($senderId, $members)) {
            throw ValidationException::withMessages([
                'conversation_id' => ['Sender is not a member of this conversation.'],
            ]);
        }

        // Validate friendship if direct conversation
        $conversation = Conversation::findOrFail($conversationId);
        if ($conversation->type === 'direct') {
            $otherUserId = collect($members)->first(fn($id) => $id !== $senderId);
            if ($otherUserId) {
                // Block check — either direction prevents messaging
                if ($this->friendRepository->isBlocked($senderId, $otherUserId)) {
                    throw ValidationException::withMessages([
                        'conversation_id' => ['You have blocked this user. Unblock them to send messages.'],
                    ]);
                }
                if ($this->friendRepository->isBlocked($otherUserId, $senderId)) {
                    throw ValidationException::withMessages([
                        'conversation_id' => ['You cannot send messages to this user.'],
                    ]);
                }
                if (!$this->friendRepository->areFriends($senderId, $otherUserId)) {
                    throw ValidationException::withMessages([
                        'conversation_id' => ['You can only message accepted contacts.'],
                    ]);
                }
            }
        }

        $message = $this->messageRepository->createMessage($conversationId, $senderId, $type, $body, $iv, $replyToMessageId);

        // Send to real-time broadcaster (in-app delivery via Reverb WebSocket)
        broadcast(new MessageSent($message))->toOthers();

        // Dispatch queued job to send FCM push notification to recipients
        // who are not currently connected via WebSocket (backgrounded/killed app).
        // Only metadata is passed — never plaintext content — to preserve E2E encryption.
        SendMessagePushNotification::dispatch(
            $message->id,
            $conversationId,
            $senderId,
            $message->sender->name ?? 'Unknown',
        )->onQueue('default');

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
            $result = $this->messageRepository->deleteForEveryone($messageId);
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
