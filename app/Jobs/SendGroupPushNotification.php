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
use Kreait\Firebase\Messaging\ApnsConfig;
use Kreait\Firebase\Messaging\CloudMessage;

class SendGroupPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        private readonly int $recipientId,
        private readonly int $conversationId,
        private readonly string $groupName,
        private readonly string $addedByName,
        private readonly string $type = 'group_added'
    ) {}

    public function handle(Messaging $messaging): void
    {
        $deviceTokens = DeviceToken::where('user_id', $this->recipientId)->get();
        if ($deviceTokens->isEmpty()) {
            Log::info('SendGroupPushNotification skipped: No FCM tokens found', ['user_id' => $this->recipientId]);
            return;
        }

        $notificationTitle = $this->groupName;
        $notificationBody = "You have been added to {$this->groupName} by {$this->addedByName}";

        $seenTokens = [];
        foreach ($deviceTokens as $deviceToken) {
            if (in_array($deviceToken->fcm_token, $seenTokens)) continue;
            $seenTokens[] = $deviceToken->fcm_token;

            $message = CloudMessage::withTarget('token', $deviceToken->fcm_token)
                ->withData([
                    'type'            => $this->type,
                    'chat_id'         => (string) $this->conversationId,
                    'conversation_id' => (string) $this->conversationId,
                    'group_name'      => $this->groupName,
                    'sender_name'     => $this->addedByName,
                    'title'           => $notificationTitle,
                    'body'            => $notificationBody,
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
                            'badge'            => 1,
                            'content-available' => 1,
                            'mutable-content'   => 1,
                        ],
                    ],
                ]));

            try {
                $messaging->send($message);
                Log::info('Group push notification sent successfully', [
                    'user_id' => $this->recipientId,
                    'group'   => $this->groupName,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Group push notification failed', ['error' => $e->getMessage()]);
            }
        }
    }
}
