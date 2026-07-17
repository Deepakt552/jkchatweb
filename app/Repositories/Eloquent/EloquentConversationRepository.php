<?php

namespace App\Repositories\Eloquent;

use App\Models\Conversation;
use App\Models\ConversationMember;
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
        $conversations = Conversation::whereHas('members', function ($query) use ($userId) {
                $query->where('users.id', $userId);
            })
            // Hide conversations the user soft-deleted until they get new activity
            ->whereHas('conversationMembers', function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->where(function ($q) {
                        $q->whereNull('hidden_at')
                            ->orWhereExists(function ($exists) {
                                $exists->select(DB::raw(1))
                                    ->from('messages')
                                    ->whereColumn('messages.conversation_id', 'conversation_members.conversation_id')
                                    ->whereColumn('messages.created_at', '>', 'conversation_members.hidden_at');
                            });
                    });
            })
            ->when($since, fn($q) => $q->where('updated_at', '>', $since)) // delta filter
            ->with([
                'members',
                'messages' => function ($q) use ($userId) {
                    $q->with(['reads', 'conversation.conversationMembers'])->where(function ($sub) use ($userId) {
                        $sub->whereNotExists(function ($existsQuery) use ($userId) {
                            $existsQuery->select(DB::raw(1))
                                ->from('conversation_members')
                                ->whereColumn('conversation_members.conversation_id', 'messages.conversation_id')
                                ->where('conversation_members.user_id', $userId)
                                ->whereNotNull('conversation_members.cleared_at')
                                ->whereColumn('messages.created_at', '<=', 'conversation_members.cleared_at');
                        });
                    })->latest()->limit(1);
                },
            ])
            ->get();

        // Append unread_count for each conversation
        return $conversations->map(function ($conv) use ($userId) {
            $member = $conv->conversationMembers()
                ->where('user_id', $userId)
                ->first();

            $lastReadId = $member?->last_read_message_id ?? 0;

            $unreadCount = $conv->messages()
                ->where('sender_id', '!=', $userId)
                ->where('is_deleted', false)
                ->when($lastReadId, fn($q) => $q->where('id', '>', $lastReadId))
                ->when($member?->cleared_at, fn($q) => $q->where('created_at', '>', $member->cleared_at))
                ->count();

            $conv->unread_count = $unreadCount;

            return $conv;
        });
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
