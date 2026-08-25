<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;
    public int $userId;
    public ?string $emoji;

    public function __construct(Message $message, int $userId = 0, ?string $emoji = null)
    {
        $this->message = $message;
        $this->userId = $userId;
        $this->emoji = $emoji;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageReactionUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'message_id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'reactions' => $this->message->reactions,
            'user_id' => $this->userId,
            'emoji' => $this->emoji,
        ];
    }
}
