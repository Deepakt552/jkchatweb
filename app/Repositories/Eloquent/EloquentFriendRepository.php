<?php

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Models\Friend;
use App\Models\FriendRequest;
use App\Models\BlockedUser;
use App\Repositories\Contracts\FriendRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EloquentFriendRepository implements FriendRepositoryInterface
{
    public function sendRequest(int $senderId, int $receiverId): FriendRequest
    {
        return FriendRequest::updateOrCreate(
            ['sender_id' => $senderId, 'receiver_id' => $receiverId],
            ['status' => 'pending']
        );
    }

    public function acceptRequest(int $requestId): bool
    {
        $req = FriendRequest::find($requestId);
        if (!$req || $req->status !== 'pending') {
            return false;
        }

        DB::transaction(function () use ($req) {
            $req->update(['status' => 'accepted']);

            Friend::firstOrCreate(['user_id' => $req->sender_id, 'friend_id' => $req->receiver_id]);
            Friend::firstOrCreate(['user_id' => $req->receiver_id, 'friend_id' => $req->sender_id]);

            // Spawn the direct conversation so they show in each other's chat list immediately
            $conversationRepo = app(\App\Repositories\Contracts\ConversationRepositoryInterface::class);
            $conversationRepo->findOrCreateDirectConversation($req->sender_id, $req->receiver_id);
        });

        return true;
    }

    public function rejectRequest(int $requestId): bool
    {
        $req = FriendRequest::find($requestId);
        if ($req) {
            return $req->update(['status' => 'rejected']);
        }
        return false;
    }

    public function ignoreRequest(int $requestId): bool
    {
        $req = FriendRequest::find($requestId);
        if ($req) {
            return $req->update(['status' => 'ignored']);
        }
        return false;
    }

    public function removeFriend(int $userId, int $friendId): bool
    {
        DB::transaction(function () use ($userId, $friendId) {
            Friend::where('user_id', $userId)->where('friend_id', $friendId)->delete();
            Friend::where('user_id', $friendId)->where('friend_id', $userId)->delete();

            // Clear friend requests
            FriendRequest::where(function ($q) use ($userId, $friendId) {
                $q->where('sender_id', $userId)->where('receiver_id', $friendId);
            })->orWhere(function ($q) use ($userId, $friendId) {
                $q->where('sender_id', $friendId)->where('receiver_id', $userId);
            })->delete();
        });

        return true;
    }

    public function blockUser(int $blockerId, int $blockedId): bool
    {
        DB::transaction(function () use ($blockerId, $blockedId) {
            BlockedUser::firstOrCreate([
                'blocker_id' => $blockerId,
                'blocked_id' => $blockedId,
            ]);

            // Remove friendship if any
            $this->removeFriend($blockerId, $blockedId);
        });

        return true;
    }

    public function unblockUser(int $blockerId, int $blockedId): bool
    {
        return BlockedUser::where('blocker_id', $blockerId)
            ->where('blocked_id', $blockedId)
            ->delete() > 0;
    }

    public function getFriends(int $userId): Collection
    {
        $friendIds = Friend::where('user_id', $userId)->pluck('friend_id');
        return User::whereIn('id', $friendIds)->get();
    }

    public function getPendingRequests(int $userId): Collection
    {
        return FriendRequest::with('sender')
            ->where('receiver_id', $userId)
            ->where('status', 'pending')
            ->get();
    }

    public function getSentRequests(int $userId): Collection
    {
        return FriendRequest::with('receiver')
            ->where('sender_id', $userId)
            ->get();
    }

    public function getBlockedUsers(int $userId): Collection
    {
        $blockedIds = BlockedUser::where('blocker_id', $userId)->pluck('blocked_id');
        return User::whereIn('id', $blockedIds)->get();
    }

    public function areFriends(int $user1, int $user2): bool
    {
        return Friend::where('user_id', $user1)->where('friend_id', $user2)->exists();
    }

    public function isBlocked(int $user1, int $user2): bool
    {
        return BlockedUser::where('blocker_id', $user1)->where('blocked_id', $user2)->exists();
    }
}
