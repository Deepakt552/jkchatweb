<?php

namespace App\Services;

use App\Models\FriendRequest;
use App\Repositories\Contracts\FriendRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class FriendService
{
    protected FriendRepositoryInterface $friendRepository;

    public function __construct(FriendRepositoryInterface $friendRepository)
    {
        $this->friendRepository = $friendRepository;
    }

    public function sendFriendRequest(int $senderId, int $receiverId): FriendRequest
    {
        if ($senderId === $receiverId) {
            throw ValidationException::withMessages([
                'receiver_id' => ['You cannot add yourself as a friend.'],
            ]);
        }

        // Check block status
        if ($this->friendRepository->isBlocked($receiverId, $senderId)) {
            throw ValidationException::withMessages([
                'receiver_id' => ['You are blocked by this user.'],
            ]);
        }

        if ($this->friendRepository->isBlocked($senderId, $receiverId)) {
            throw ValidationException::withMessages([
                'receiver_id' => ['You have blocked this user. Unblock them first.'],
            ]);
        }

        // Check if already friends
        if ($this->friendRepository->areFriends($senderId, $receiverId)) {
            throw ValidationException::withMessages([
                'receiver_id' => ['You are already friends with this user.'],
            ]);
        }

        $friendReq = $this->friendRepository->sendRequest($senderId, $receiverId);

        // Dispatch private event for receiver
        $sender = \App\Models\User::find($senderId);
        event(new \App\Events\FriendRequestUpdated($receiverId, 'received', $sender->name, $friendReq->id));

        // Dispatch FCM Push Notification job
        \App\Jobs\SendFriendPushNotification::dispatch(
            $receiverId,
            'friend_request',
            $sender->name,
            $friendReq->id
        )->onQueue('default');

        return $friendReq;
    }

    public function acceptFriendRequest(int $requestId, int $userId): bool
    {
        $request = FriendRequest::find($requestId);
        if (!$request || $request->receiver_id !== $userId) {
            throw ValidationException::withMessages([
                'request_id' => ['Invalid friend request or unauthorized.'],
            ]);
        }

        $result = $this->friendRepository->acceptRequest($requestId);

        if ($result) {
            // Dispatch private event for sender (the person who originally requested)
            $receiver = \App\Models\User::find($userId);
            event(new \App\Events\FriendRequestUpdated($request->sender_id, 'accepted', $receiver->name, $requestId));

            // Dispatch FCM Push Notification job
            \App\Jobs\SendFriendPushNotification::dispatch(
                $request->sender_id,
                'friend_accept',
                $receiver->name,
                $requestId
            )->onQueue('default');
        }

        return $result;
    }

    public function rejectFriendRequest(int $requestId, int $userId): bool
    {
        $request = FriendRequest::find($requestId);
        if (!$request || $request->receiver_id !== $userId) {
            throw ValidationException::withMessages([
                'request_id' => ['Invalid friend request or unauthorized.'],
            ]);
        }

        return $this->friendRepository->rejectRequest($requestId);
    }

    public function cancelFriendRequest(int $requestId, int $userId): bool
    {
        $request = FriendRequest::find($requestId);
        if (!$request || $request->sender_id !== $userId) {
            throw ValidationException::withMessages([
                'request_id' => ['Invalid friend request or unauthorized.'],
            ]);
        }

        return $request->delete();
    }

    public function removeFriend(int $userId, int $friendId): bool
    {
        return $this->friendRepository->removeFriend($userId, $friendId);
    }

    public function blockUser(int $blockerId, int $blockedId): bool
    {
        if ($blockerId === $blockedId) {
            throw ValidationException::withMessages([
                'blocked_id' => ['You cannot block yourself.'],
            ]);
        }

        return $this->friendRepository->blockUser($blockerId, $blockedId);
    }

    public function unblockUser(int $blockerId, int $blockedId): bool
    {
        return $this->friendRepository->unblockUser($blockerId, $blockedId);
    }

    public function getFriendsList(int $userId): Collection
    {
        return $this->friendRepository->getFriends($userId);
    }

    public function getPendingRequests(int $userId): Collection
    {
        return $this->friendRepository->getPendingRequests($userId);
    }

    public function getSentRequests(int $userId): Collection
    {
        return $this->friendRepository->getSentRequests($userId);
    }

    public function getBlockedUsers(int $userId): Collection
    {
        return $this->friendRepository->getBlockedUsers($userId);
    }

    /** Public proxy for controllers */
    public function isBlocked(int $blockerId, int $blockedId): bool
    {
        return (bool) $this->friendRepository->isBlocked($blockerId, $blockedId);
    }

    /** Public proxy for controllers */
    public function areFriends(int $userA, int $userB): bool
    {
        return (bool) $this->friendRepository->areFriends($userA, $userB);
    }
}
