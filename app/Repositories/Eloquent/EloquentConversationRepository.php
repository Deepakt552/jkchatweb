<?php

namespace App\Repositories\Eloquent;

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Message;
use App\Repositories\Contracts\ConversationRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EloquentConversationRepository implements ConversationRepositoryInterface
{
    public function findOrCreateDirectConversation(int $user1, int $user2): Conversation
    {
        // Find existing direct conversation with both members (include soft-deleted)
        $conv = Conversation::withTrashed()
            ->where('type', 'direct')
            ->whereHas('conversationMembers', function ($query) use ($user1) {
                $query->where('user_id', $user1);
            })
            ->whereHas('conversationMembers', function ($query) use ($user2) {
                $query->where('user_id', $user2);
            })
            ->first();

        if ($conv) {
            if ($conv->trashed()) {
                $conv->restore();
                $conv->update(['deleted_by' => null, 'delete_reason' => null]);
            }
            // Un-hide for both members so the chat reappears when they message again
            ConversationMember::where('conversation_id', $conv->id)
                ->whereIn('user_id', [$user1, $user2])
                ->update(['hidden_at' => null]);

            return $conv;
        }

        return DB::transaction(function () use ($user1, $user2) {
            $conv = Conversation::create([
                'type' => 'direct',
            ]);

            ConversationMember::create([
                'conversation_id' => $conv->id,
                'user_id' => $user1,
                'role' => 'member',
            ]);

            ConversationMember::create([
                'conversation_id' => $conv->id,
                'user_id' => $user2,
                'role' => 'member',
            ]);

            return $conv;
        });
    }

    public function createGroupConversation(string $name, int $creatorId, array $memberIds): Conversation
    {
        return DB::transaction(function () use ($name, $creatorId, $memberIds) {
            $conv = Conversation::create([
                'name' => $name,
                'type' => 'group',
            ]);

            ConversationMember::create([
                'conversation_id' => $conv->id,
                'user_id' => $creatorId,
                'role' => 'admin',
            ]);

            foreach ($memberIds as $id) {
                if ($id != $creatorId) {
                    ConversationMember::create([
                        'conversation_id' => $conv->id,
                        'user_id' => $id,
                        'role' => 'member',
                    ]);
                }
            }

            return $conv;
        });
    }

    public function getUserConversations(int $userId, ?string $since = null): Collection
    {
        try {
            $conversations = Conversation::whereHas('conversationMembers', function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                })
                ->when($since, fn($q) => $q->where('updated_at', '>', $since))
                ->with(['members'])
                ->get();

            $convIds = $conversations->pluck('id')->all();

            if (!empty($convIds)) {
                try {
                    $latestMessageIds = Message::select(DB::raw('MAX(id) as id'))
                        ->whereIn('conversation_id', $convIds)
                        ->where('is_deleted', false)
                        ->groupBy('conversation_id')
                        ->pluck('id')
                        ->filter()
                        ->all();

                    $latestMessages = !empty($latestMessageIds)
                        ? Message::whereIn('id', $latestMessageIds)
                            ->with(['reads', 'conversation.conversationMembers'])
                            ->get()
                            ->keyBy('conversation_id')
                        : collect();

                    $conversations->each(function ($conv) use ($latestMessages) {
                        $msg = $latestMessages->get($conv->id);
                        $conv->setRelation('messages', $msg ? collect([$msg]) : collect([]));
                    });
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Error loading latest messages for conversations: ' . $e->getMessage());
                }
            }

            // Append unread_count for each conversation safely
            return $conversations->map(function ($conv) use ($userId) {
                try {
                    $member = ConversationMember::where('conversation_id', $conv->id)
                        ->where('user_id', $userId)
                        ->first();

                    $lastReadId = $member?->last_read_message_id ?? 0;
                    $clearedAt = $member?->cleared_at;

                    $unreadQuery = Message::where('conversation_id', $conv->id)
                        ->where('sender_id', '!=', $userId)
                        ->where('is_deleted', false);

                    if ($lastReadId > 0) {
                        $unreadQuery->where('id', '>', $lastReadId);
                    }
                    if ($clearedAt) {
                        $unreadQuery->where('created_at', '>', $clearedAt);
                    }

                    $conv->unread_count = $unreadQuery->count();
                } catch (\Throwable $e) {
                    $conv->unread_count = 0;
                }

                return $conv;
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('getUserConversations error: ' . $e->getMessage());
            return collect();
        }
    }

    public function getConversationMembers(int $conversationId): Collection
    {
        return ConversationMember::where('conversation_id', $conversationId)
            ->with('user')
            ->get();
    }

    public function addMember(int $conversationId, int $userId, string $role = 'member'): bool
    {
        return ConversationMember::firstOrCreate([
            'conversation_id' => $conversationId,
            'user_id' => $userId,
        ], [
            'role' => $role,
        ])->wasRecentlyCreated || true;
    }

    public function removeMember(int $conversationId, int $userId): bool
    {
        return ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->delete() > 0;
    }

    public function updateLastRead(int $conversationId, int $userId, int $messageId): bool
    {
        return ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->update(['last_read_message_id' => $messageId]) > 0;
    }
}
