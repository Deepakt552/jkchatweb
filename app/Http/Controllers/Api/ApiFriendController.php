<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FriendService;
use Illuminate\Http\Request;

class ApiFriendController extends Controller
{
    protected FriendService $friendService;

    public function __construct(FriendService $friendService)
    {
        $this->friendService = $friendService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        return response()->json($this->friendService->getFriendsList($user->id));
    }

    public function pending(Request $request)
    {
        $user = $request->user();
        return response()->json($this->friendService->getPendingRequests($user->id));
    }

    public function sent(Request $request)
    {
        $user = $request->user();
        return response()->json($this->friendService->getSentRequests($user->id));
    }

    public function send(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|integer',
        ]);

        $user = $request->user();
        $friendReq = $this->friendService->sendFriendRequest($user->id, $request->receiver_id);

        return response()->json([
            'message' => 'Friend request sent successfully.',
            'request' => $friendReq,
        ]);
    }

    public function accept(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->acceptFriendRequest($request->request_id, $user->id);

        return response()->json(['message' => 'Friend request accepted.']);
    }

    public function reject(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->rejectFriendRequest($request->request_id, $user->id);

        return response()->json(['message' => 'Friend request rejected.']);
    }

    public function cancel(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->cancelFriendRequest($request->request_id, $user->id);

        return response()->json(['message' => 'Friend request cancelled.']);
    }

    public function remove(Request $request)
    {
        $request->validate([
            'friend_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->removeFriend($user->id, $request->friend_id);

        return response()->json(['message' => 'Contact removed from friends list.']);
    }

    public function block(Request $request)
    {
        $request->validate([
            'blocked_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->blockUser($user->id, $request->blocked_id);

        return response()->json(['message' => 'User blocked.']);
    }

    public function unblock(Request $request)
    {
        $request->validate([
            'blocked_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->unblockUser($user->id, $request->blocked_id);

        return response()->json(['message' => 'User unblocked.']);
    }

    public function blocked(Request $request)
    {
        $user = $request->user();
        return response()->json($this->friendService->getBlockedUsers($user->id));
    }

    public function search(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:1',
        ]);

        $query = $request->input('query');
        $userId = $request->user()->id;

        // Search users that are not the current user
        $users = User::where('id', '!=', $userId)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('username', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%");
            })
            ->limit(20)
            ->get();

        return response()->json($users);
    }

    /**
     * GET /friends/profile/{userId}
     * Returns the public profile of a user, respecting block & privacy settings.
     */
    public function getContactProfile(Request $request, $userId)
    {
        $viewer  = $request->user();
        $contact = User::findOrFail($userId);

        // Check if viewer is blocked by contact
        $blockedByContact = $this->friendService->isBlocked($contact->id, $viewer->id);
        // Check if viewer has blocked contact
        $viewerBlockedContact = $this->friendService->isBlocked($viewer->id, $contact->id);

        // Determine privacy of last_seen
        $privacy = $contact->privacy_settings ?? [];
        $lastSeenVisibility = is_array($privacy)
            ? ($privacy['last_seen_visibility'] ?? 'everyone')
            : 'everyone';

        $areFriends = $this->friendService->areFriends($viewer->id, $contact->id);

        $showLastSeen = match($lastSeenVisibility) {
            'everyone'  => true,
            'contacts'  => $areFriends,
            'nobody'    => false,
            default     => true,
        };

        // If viewer is blocked by contact, hide sensitive info
        if ($blockedByContact) {
            $showLastSeen = false;
        }

        return response()->json([
            'id'           => $contact->id,
            'name'         => $contact->name,
            'username'     => $contact->username,
            'email'        => $contact->email,
            'status'       => $contact->about ?? 'Hey! I use SecureChat',
            'is_online'    => $contact->online_status === 'online',
            'last_seen_at' => $showLastSeen ? $contact->updated_at : null,
            'avatar_url'   => ($blockedByContact || $viewerBlockedContact) ? null : $contact->avatar_url,
            'is_blocked'   => $viewerBlockedContact,
            'is_blocked_by'=> $blockedByContact,
            'are_friends'  => $areFriends,
        ]);
    }
}
