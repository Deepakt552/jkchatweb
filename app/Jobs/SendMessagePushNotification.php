<?php

namespace App\Jobs;

use App\Models\ConversationMember;
use App\Models\DeviceToken;
use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\ApnsConfig;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class SendMessagePushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        private readonly int $messageId,
        private readonly int $conversationId,
        private readonly int $senderId,
        private readonly string $senderName,
        private readonly string $body = 'New message',
        private readonly string $type = 'text',
        private readonly ?string $iv = null,
    ) {}

    public function handle(Messaging $messaging): void
    {
        $conversation = \App\Models\Conversation::find($this->conversationId);
        $isGroup = $conversation && $conversation->type === 'group';
        $groupName = $conversation ? $conversation->name : 'Group';

        // Get all members of the conversation except the sender
        $recipientIds = ConversationMember::where('conversation_id', $this->conversationId)
            ->where('user_id', '!=', $this->senderId)
            ->pluck('user_id');

        if ($recipientIds->isEmpty()) {
            return;
        }

        foreach ($recipientIds as $recipientId) {
            // Get device tokens for this user (multi-device)
            $deviceTokens = DeviceToken::where('user_id', $recipientId)->get();

            if ($deviceTokens->isEmpty()) {
                Log::info('SendMessagePushNotification skipped: No FCM tokens found', ['user_id' => $recipientId]);
                continue;
            }

            // Check if this recipient was mentioned in group message
            $isMentioned = false;
            if ($isGroup) {
                $recipientUser = \App\Models\User::find($recipientId);
                if ($recipientUser) {
                    $uName = strtolower($recipientUser->name);
                    $uHandle = strtolower($recipientUser->username ?? '');
                    $bodyLower = strtolower($this->body);
                    if (($uHandle && str_contains($bodyLower, '@' . $uHandle)) ||
                        str_contains($bodyLower, '@' . $uName) ||
                        str_contains($bodyLower, '@' . explode(' ', $uName)[0])) {
                        $isMentioned = true;
                    }
                }
            }

            // Count total unread CONVERSATIONS (distinct chats) for badge
            try {
                $unreadChats = DB::table('messages')
                    ->join('conversation_members', function ($join) use ($recipientId) {
                        $join->on('messages.conversation_id', '=', 'conversation_members.conversation_id')
                             ->where('conversation_members.user_id', '=', $recipientId);
                    })
                    ->where('messages.sender_id', '!=', $recipientId)
                    ->where('messages.is_deleted', false)
                    ->where(function ($q) {
                        $q->whereNull('conversation_members.cleared_at')
                          ->orWhereColumn('messages.created_at', '>', 'conversation_members.cleared_at');
                    })
                    ->whereNotExists(function ($q) use ($recipientId) {
                        $q->select(DB::raw(1))
                          ->from('message_reads')
                          ->whereColumn('message_reads.message_id', 'messages.id')
                          ->where('message_reads.user_id', $recipientId)
                          ->whereNotNull('message_reads.read_at');
                    })
                    ->distinct('messages.conversation_id')
                    ->count('messages.conversation_id');
            } catch (\Throwable $e) {
                Log::warning('Badge count query failed, using fallback', ['error' => $e->getMessage()]);
                $unreadChats = 1;
            }

            $badgeCount = max(1, (int) $unreadChats);

            // Send to each unique token
            $seenTokens = [];
            foreach ($deviceTokens as $deviceToken) {
                if (in_array($deviceToken->fcm_token, $seenTokens)) continue;
                $seenTokens[] = $deviceToken->fcm_token;
                $this->sendToDevice($messaging, $deviceToken->fcm_token, $deviceToken->device_id, $recipientId, $badgeCount, $isGroup, $groupName, $isMentioned);
            }
        }
    }

    private function sendToDevice(Messaging $messaging, string $token, string $deviceId, int $recipientId, int $badgeCount = 1, bool $isGroup = false, string $groupName = '', bool $isMentioned = false): void
    {
        $notificationBody = 'New message';
        if ($this->type === 'image') {
            $notificationBody = '📷 Photo';
        } elseif ($this->type === 'audio' || $this->type === 'voice') {
            $notificationBody = '🎵 Voice message';
        } elseif ($this->type === 'document') {
            $notificationBody = '📄 Document';
        } elseif ($this->iv === null && !empty($this->body)) {
            $notificationBody = $this->body;
        }

        $notificationTitle = $this->senderName;
        $msgType = 'new_message';

        if ($isGroup) {
            if ($isMentioned) {
                $notificationTitle = "{$this->senderName} in {$groupName}";
                $notificationBody = "You were mentioned in {$groupName}";
                $msgType = 'group_mention';
            } else {
                $notificationTitle = $groupName;
                $notificationBody = "{$this->senderName}: " . $notificationBody;
                $msgType = 'group_message';
            }
        }

        // Android: data-only message — Flutter background handler shows the notification.
        // iOS: APNs alert block is kept for reliable background/terminated delivery.
        $message = CloudMessage::withTarget('token', $token)
            ->withData([
                'type'           => $msgType,
                'chat_id'        => (string) $this->conversationId,
                'conversation_id'=> (string) $this->conversationId,
                'message_id'     => (string) $this->messageId,
                'sender_id'      => (string) $this->senderId,
                'sender_name'    => $this->senderName,
                'group_name'     => $groupName,
                'title'          => $notificationTitle,
                'body'           => $notificationBody,
            ])
            ->withAndroidConfig([
                'priority' => 'high',
                'ttl'      => '86400s',
            ])
            ->withApnsConfig(ApnsConfig::fromArray([
                'headers' => [
                    'apns-priority'       => '10',
                    'apns-push-type'      => 'alert',
                    'apns-topic'          => 'com.nbs.diachat',
                    'apns-expiration'     => (string)(time() + 86400),
                ],
                'payload' => [
                    'aps' => [
                        'alert' => [
                            'title' => $notificationTitle,
                            'body'  => $notificationBody,
                        ],
                        'sound'            => 'default',
                        'badge'            => $badgeCount,
                        'content-available' => 1,
                        'mutable-content'   => 1,
                    ],
                ],
            ]));

        try {
            $result = $messaging->send($message);
            Log::info('FCM notification sent successfully', [
                'user_id'         => $recipientId,
                'device_id'       => $deviceId,
                'conversation_id' => $this->conversationId,
                'message_id'      => $this->messageId,
                'fcm_message_id'  => is_string($result) ? $result : json_encode($result),
                'badge'           => $badgeCount,
            ]);
        } catch (\Kreait\Firebase\Exception\Messaging\NotFound $e) {
            // Token is no longer registered — prune it
            DeviceToken::where('device_id', $deviceId)->delete();
            Log::warning('FCM token pruned (UNREGISTERED/NOT_FOUND) — token deleted', [
                'device_id' => $deviceId,
                'error'     => $e->getMessage(),
            ]);
        } catch (\Kreait\Firebase\Exception\Messaging\InvalidArgument $e) {
            DeviceToken::where('device_id', $deviceId)->delete();
            Log::warning('FCM token pruned (INVALID_ARGUMENT) — token deleted', [
                'device_id' => $deviceId,
                'error'     => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            Log::error('FCM send FAILED — check Firebase/APNs config', [
                'device_id'       => $deviceId,
                'user_id'         => $recipientId,
                'conversation_id' => $this->conversationId,
                'error_class'     => get_class($e),
                'error'           => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get user IDs currently subscribed to the presence-chat.{conversationId} channel.
     * Returns empty array if Reverb query fails (fail-open: we'll just send the notification).
     */
    private function getPresenceChatUsers(): array
    {
        try {
            $pusher = Broadcast::driver()->getPusher();
            $response = $pusher->getPresenceUsers('presence-chat.' . $this->conversationId);
            // Response is an object with a 'users' array: [['id' => '3'], ['id' => '5']]
            if (is_object($response) && property_exists($response, 'users')) {
                return array_column((array) $response->users, 'id');
            }
        } catch (\Throwable $e) {
            Log::debug('Presence check failed (non-critical)', ['error' => $e->getMessage()]);
        }
        return [];
    }
}
