<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Conversation;
use App\Models\Message;
use App\Events\MessageSent;
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

        // Add a system message to direct conversation if exists
        try {
            $conversation = Conversation::where('type', 'direct')
                ->whereHas('members', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                })
                ->whereHas('members', function ($q) use ($request) {
                    $q->where('users.id', $request->blocked_id);
                })->first();

            if ($conversation) {
                $msg = Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $user->id,
                    'type' => 'system',
                    'body' => 'You blocked this contact.',
                    'status' => 'read',
                ]);
                $conversation->touch();
                broadcast(new MessageSent($msg->load('sender')))->toOthers();
            }
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'User blocked.']);
    }

    public function unblock(Request $request)
    {
        $request->validate([
            'blocked_id' => 'required|integer',
        ]);

        $user = $request->user();
        $this->friendService->unblockUser($user->id, $request->blocked_id);

        // Add a system message to direct conversation if exists
        try {
            $conversation = Conversation::where('type', 'direct')
                ->whereHas('members', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                })
                ->whereHas('members', function ($q) use ($request) {
                    $q->where('users.id', $request->blocked_id);
                })->first();

            if ($conversation) {
                $msg = Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $user->id,
                    'type' => 'system',
                    'body' => 'You unblocked this contact.',
                    'status' => 'read',
                ]);
                $conversation->touch();
                broadcast(new MessageSent($msg->load('sender')))->toOthers();
            }
        } catch (\Throwable $e) {}

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

        $friendIdsDirect = \App\Models\Friend::where('user_id', $userId)->pluck('friend_id')->toArray();
        $friendIdsInverse = \App\Models\Friend::where('friend_id', $userId)->pluck('user_id')->toArray();

        $acceptedRequestFriendIds = \App\Models\FriendRequest::where(function ($q) use ($userId) {
            $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
        })->where('status', 'accepted')->get()->map(function ($r) use ($userId) {
            return $r->sender_id === $userId ? $r->receiver_id : $r->sender_id;
        })->toArray();

        $allFriendIds = array_unique(array_merge($friendIdsDirect, $friendIdsInverse, $acceptedRequestFriendIds));

        $friendRequests = \App\Models\FriendRequest::where(function ($q) use ($userId) {
            $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
        })->where('status', 'pending')->get();

        $results = $users->map(function ($u) use ($userId, $allFriendIds, $friendRequests) {
            $isFriend = in_array($u->id, $allFriendIds);
            $req = $friendRequests->first(function ($r) use ($u, $userId) {
                return ($r->sender_id === $userId && $r->receiver_id === $u->id) ||
                       ($r->receiver_id === $userId && $r->sender_id === $u->id);
            });

            return [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'email' => $u->email,
                'avatar_url' => $u->avatar_url,
                'department' => $u->department,
                'designation' => $u->designation,
                'is_friend' => $isFriend,
                'has_pending_request' => $req !== null,
                'is_sender' => $req ? ($req->sender_id === $userId) : false,
                'request_id' => $req ? $req->id : null,
            ];
        });

        return response()->json($results);
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

        $pendingRequestFromViewer = \App\Models\FriendRequest::where('sender_id', $viewer->id)
            ->where('receiver_id', $contact->id)
            ->where('status', 'pending')
            ->first();

        $pendingRequestToViewer = \App\Models\FriendRequest::where('sender_id', $contact->id)
            ->where('receiver_id', $viewer->id)
            ->where('status', 'pending')
            ->first();

        return response()->json([
            'id'                  => $contact->id,
            'name'                => $contact->name,
            'username'            => $contact->username,
            'email'               => $contact->email,
            'status'              => $contact->about ?? 'Hey! I use SecureChat',
            'is_online'           => $contact->online_status === 'online',
            'last_seen_at'        => $showLastSeen ? ($contact->last_seen_at ? $contact->last_seen_at->toIso8601String() : ($contact->updated_at ? $contact->updated_at->toIso8601String() : null)) : null,
            'avatar_url'          => ($blockedByContact || $viewerBlockedContact) ? null : $contact->avatar_url,
            'is_blocked'          => $viewerBlockedContact,
            'is_blocked_by'       => $blockedByContact,
            'are_friends'         => $areFriends,
            'has_sent_request'    => $pendingRequestFromViewer !== null,
            'sent_request_id'     => $pendingRequestFromViewer?->id,
            'has_received_request'=> $pendingRequestToViewer !== null,
            'received_request_id' => $pendingRequestToViewer?->id,
        ]);
    }
}
