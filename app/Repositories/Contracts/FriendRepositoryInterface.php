<?php

namespace App\Repositories\Contracts;

use App\Models\FriendRequest;
use Illuminate\Support\Collection;

interface FriendRepositoryInterface
{
    public function sendRequest(int $senderId, int $receiverId): FriendRequest;
    public function acceptRequest(int $requestId): bool;
    public function rejectRequest(int $requestId): bool;
    public function ignoreRequest(int $requestId): bool;
    public function removeFriend(int $userId, int $friendId): bool;
    public function blockUser(int $blockerId, int $blockedId): bool;
    public function unblockUser(int $blockerId, int $blockedId): bool;
    public function getFriends(int $userId): Collection;
    public function getPendingRequests(int $userId): Collection;
    public function getSentRequests(int $userId): Collection;
    public function getBlockedUsers(int $userId): Collection;
    public function areFriends(int $user1, int $user2): bool;
    public function isBlocked(int $user1, int $user2): bool;
}
