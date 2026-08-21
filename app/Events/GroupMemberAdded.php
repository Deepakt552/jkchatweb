<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GroupMemberAdded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public int $conversationId;
    public string $groupName;
    public string $addedByName;
    public string $type; // 'GroupCreated' | 'GroupMemberAdded'

    public function __construct(int $userId, int $conversationId, string $groupName, string $addedByName, string $type = 'GroupMemberAdded')
    {
        $this->userId = $userId;
        $this->conversationId = $conversationId;
        $this->groupName = $groupName;
        $this->addedByName = $addedByName;
        $this->type = $type;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('user.' . $this->userId);
    }

    public function broadcastAs(): string
    {
        return 'GroupMemberAdded';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'conversation_id' => $this->conversationId,
            'chat_id' => $this->conversationId,
            'group_name' => $this->groupName,
            'added_by_name' => $this->addedByName,
        ];
    }
}
