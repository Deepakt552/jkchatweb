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
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;

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
    ) {}

    public function handle(Messaging $messaging): void
    {
        // Get all members of the conversation except the sender
        $recipientIds = ConversationMember::where('conversation_id', $this->conversationId)
            ->where('user_id', '!=', $this->senderId)
            ->pluck('user_id');

        if ($recipientIds->isEmpty()) {
            return;
        }

        // Determine which users are actively inside this specific chat screen
        // by checking the Reverb presence channel (presence-chat.{conversationId})
        $activeInChatUserIds = $this->getPresenceChatUsers();

        foreach ($recipientIds as $recipientId) {
            // Skip: user is actively viewing this exact chat — Reverb already delivered it
            if (in_array($recipientId, $activeInChatUserIds, true)) {
                Log::debug('FCM skipped: user in presence channel', [
                    'user_id' => $recipientId,
                    'conversation_id' => $this->conversationId,
                ]);
                continue;
            }

            // Get all FCM tokens for this user (multi-device)
            $tokens = DeviceToken::where('user_id', $recipientId)->pluck('fcm_token', 'device_id');

            if ($tokens->isEmpty()) {
                continue;
            }

            foreach ($tokens as $deviceId => $token) {
                $this->sendToDevice($messaging, $token, $deviceId, $recipientId);
            }
        }
    }

    private function sendToDevice(Messaging $messaging, string $token, string $deviceId, int $recipientId): void
    {
        // Data-only FCM message — NEVER include plaintext message body or decryption key
        $message = CloudMessage::withTarget('token', $token)
            ->withData([
                'type'           => 'new_message',
                'chat_id'        => (string) $this->conversationId,
                'message_id'     => (string) $this->messageId,
                'sender_id'      => (string) $this->senderId,
                'sender_name'    => $this->senderName,
            ])
            ->withAndroidConfig([
                'priority' => 'high',
                'ttl'      => '86400s',
            ])
            ->withApnsConfig([
                'headers' => [
                    'apns-priority' => '10',
                ],
                'payload' => [
                    'aps' => [
                        'content-available' => 1, // Background wakeup for iOS
                    ],
                ],
            ]);

        try {
            $messaging->send($message);
            Log::info('FCM notification sent', [
                'user_id'  => $recipientId,
                'device_id' => $deviceId,
                'conversation_id' => $this->conversationId,
                'message_id' => $this->messageId,
            ]);
        } catch (\Kreait\Firebase\Exception\Messaging\NotFound $e) {
            // Token is no longer registered — prune it
            DeviceToken::where('device_id', $deviceId)->delete();
            Log::info('FCM token pruned (UNREGISTERED)', ['device_id' => $deviceId]);
        } catch (\Kreait\Firebase\Exception\Messaging\InvalidArgument $e) {
            DeviceToken::where('device_id', $deviceId)->delete();
            Log::warning('FCM token pruned (invalid)', ['device_id' => $deviceId, 'error' => $e->getMessage()]);
        } catch (\Throwable $e) {
            Log::error('FCM send failed', [
                'device_id' => $deviceId,
                'error' => $e->getMessage(),
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
