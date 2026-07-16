<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TypingIndicator implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public int $conversationId;
    public bool $isTyping;

    public function __construct(int $userId, int $conversationId, bool $isTyping)
    {
        $this->userId = $userId;
        $this->conversationId = $conversationId;
        $this->isTyping = $isTyping;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'conversation_id' => $this->conversationId,
            'is_typing' => $this->isTyping,
        ];
    }
}
