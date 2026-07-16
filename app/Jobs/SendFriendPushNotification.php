<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;

class SendFriendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private readonly int $recipientId,
        private readonly string $type, // 'friend_request' | 'friend_accept'
        private readonly string $senderName,
        private readonly int $requestId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(Messaging $messaging): void
    {
        $tokens = DeviceToken::where('user_id', $this->recipientId)->pluck('fcm_token', 'device_id');

        if ($tokens->isEmpty()) {
            Log::info('SendFriendPushNotification skipped: No FCM tokens found', ['user_id' => $this->recipientId]);
            return;
        }

        foreach ($tokens as $deviceId => $token) {
            $message = CloudMessage::withTarget('token', $token)
                ->withData([
                    'type'        => $this->type,
                    'sender_name' => $this->senderName,
                    'request_id'  => (string) $this->requestId,
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
                            'content-available' => 1,
                        ],
                    ],
                ]);

            try {
                $messaging->send($message);
                Log::info('FCM friend notification sent', [
                    'recipient_id' => $this->recipientId,
                    'device_id'    => $deviceId,
                    'type'         => $this->type,
                ]);
            } catch (\Kreait\Firebase\Exception\Messaging\NotFound $e) {
                DeviceToken::where('device_id', $deviceId)->delete();
                Log::info('FCM token pruned (UNREGISTERED)', ['device_id' => $deviceId]);
            } catch (\Kreait\Firebase\Exception\Messaging\InvalidArgument $e) {
                DeviceToken::where('device_id', $deviceId)->delete();
                Log::warning('FCM token pruned (invalid)', ['device_id' => $deviceId, 'error' => $e->getMessage()]);
            } catch (\Throwable $e) {
                Log::error('FCM friend send failed', [
                    'device_id' => $deviceId,
                    'error'     => $e->getMessage(),
                ]);
            }
        }
    }
}
