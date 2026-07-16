<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing(['sender', 'replyTo.sender']);
        return [
            'id'             => $this->message->id,
            'conversation_id'=> $this->message->conversation_id,
            'sender_id'      => $this->message->sender_id,
            'sender_name'    => $this->message->sender->name ?? 'Unknown',
            'type'           => $this->message->type,
            'body'           => $this->message->body,
            'iv'             => $this->message->iv,
            'is_edited'      => $this->message->is_edited,
            'is_deleted'     => $this->message->is_deleted,
            'created_at'     => $this->message->created_at->toIso8601String(),
            'attachments'    => $this->message->attachments,
            'reply_to_message_id' => $this->message->reply_to_message_id,
            'reply_to'       => $this->message->replyTo ? [
                'id'             => $this->message->replyTo->id,
                'sender_id'      => $this->message->replyTo->sender_id,
                'sender_name'    => $this->message->replyTo->sender->name ?? 'Staff',
                'type'           => $this->message->replyTo->type,
                'body'           => $this->message->replyTo->body,
                'iv'             => $this->message->replyTo->iv,
            ] : null,
        ];
    }
}
