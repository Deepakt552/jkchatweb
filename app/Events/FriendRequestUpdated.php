<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $type; // 'received' | 'accepted'
    public $senderName;
    public $requestId;

    /**
     * Create a new event instance.
     */
    public function __construct(int $userId, string $type, string $senderName, int $requestId)
    {
        $this->userId = $userId;
        $this->type = $type;
        $this->senderName = $senderName;
        $this->requestId = $requestId;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->userId);
    }

    /**
     * Get the broadcast name.
     */
    public function broadcastAs()
    {
        return 'FriendRequestUpdated';
    }
}
