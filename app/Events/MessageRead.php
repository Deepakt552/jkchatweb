<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $messageId;
    public int $userId;
    public string $status; // 'delivered' or 'read'
    public int $conversationId;

    public function __construct(int $messageId, int $userId, string $status, int $conversationId)
    {
        $this->messageId = $messageId;
        $this->userId = $userId;
        $this->status = $status;
        $this->conversationId = $conversationId;
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
            'message_id' => $this->messageId,
            'user_id' => $this->userId,
            'status' => $this->status,
            'conversation_id' => $this->conversationId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
