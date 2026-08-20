<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Services\ChatService;
use App\Repositories\Contracts\ConversationRepositoryInterface;
use Illuminate\Http\Request;

class ApiChatController extends Controller
{
    protected ChatService $chatService;
    protected ConversationRepositoryInterface $conversationRepository;

    public function __construct(
        ChatService $chatService,
        ConversationRepositoryInterface $conversationRepository
    ) {
        $this->chatService = $chatService;
        $this->conversationRepository = $conversationRepository;
    }

    public function conversations(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([], 200);
            }
            $since = $request->input('since');
            $convs = $this->chatService->getConversations($user->id, $since);
            return response()->json($convs);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('ApiChatController conversations error: ' . $e->getMessage());
            return response()->json([]);
        }
    }

    public function messages(Request $request, $conversationId)
    {
        $limit    = $request->input('limit', 50);
        $beforeId = $request->input('before_id');  // pagination: load older
        $sinceId  = $request->input('since_id');   // delta: load newer only

        return response()->json(
            $this->chatService->getMessages(
                (int)$conversationId,
                $request->user()->id,
                (int)$limit,
                $beforeId ? (int)$beforeId : null,
                $sinceId  ? (int)$sinceId  : null
            )
        );
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'conversation_id'    => 'required|integer',
            'type'               => 'required|in:text,emoji,image,document,code,audio',
            'body'               => 'required|string',
            'iv'                 => 'nullable|string',
            'reply_to_message_id'=> 'nullable|integer|exists:messages,id',
        ]);

        $message = $this->chatService->sendMessage(
            $request->user()->id,
            $request->conversation_id,
            $request->type,
            $request->body,
            $request->iv,
            $request->input('reply_to_message_id')
        );

        return response()->json($message);
    }

    public function editMessage(Request $request, $messageId)
    {
        $request->validate([
            'body' => 'required|string',
            'iv' => 'nullable|string',
        ]);

        $message = $this->chatService->editMessage(
            $request->user()->id,
            (int)$messageId,
            $request->body,
            $request->input('iv')
        );

        return response()->json($message);
    }

    public function deleteMessage(Request $request, $messageId)
    {
        $request->validate([
            'everyone' => 'sometimes|boolean',
        ]);

        $everyone = $request->input('everyone', false);
        $this->chatService->deleteMessage(
            $request->user()->id,
            (int)$messageId,
            $everyone
        );

        return response()->json(['message' => 'Message deleted.']);
    }

    public function readReceipt(Request $request)
    {
        $request->validate([
            'message_id' => 'required|integer',
            'status' => 'required|in:delivered,read',
        ]);

        if ($request->status === 'read') {
            $this->chatService->markMessageAsRead($request->user()->id, $request->message_id);
        } else {
            $this->chatService->markMessageAsDelivered($request->user()->id, $request->message_id);
        }

        return response()->json(['message' => 'Receipt updated.']);
    }

    public function markConversationRead(Request $request, $id)
    {
        try {
            $user = $request->user();
            $conversationId = (int)$id;

            // Verify user is a member of this conversation
            $isMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
                ->where('user_id', $user->id)
                ->exists();

            if (!$isMember) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }

            // Get the latest message in this conversation
            $latestMessage = \App\Models\Message::where('conversation_id', $conversationId)
                ->where('sender_id', '!=', $user->id)
                ->where('is_deleted', false)
                ->latest('id')
                ->first();

            if ($latestMessage) {
                $this->conversationRepository->updateLastRead($conversationId, $user->id, $latestMessage->id);

                // Find unread messages from others
                $unreadMessages = \App\Models\Message::where('conversation_id', $conversationId)
                    ->where('sender_id', '!=', $user->id)
                    ->whereDoesntHave('reads', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->whereNotNull('read_at');
                    })
                    ->get();

                foreach ($unreadMessages as $msg) {
                    try {
                        $this->chatService->markMessageAsRead($user->id, $msg->id);
                    } catch (\Throwable $e) {
                        // Suppress individual read receipt errors
                    }
                }
            } else {
                // Fallback: if no messages from others, update last_read to latest message overall if available
                $anyLatest = \App\Models\Message::where('conversation_id', $conversationId)->latest('id')->first();
                if ($anyLatest) {
                    $this->conversationRepository->updateLastRead($conversationId, $user->id, $anyLatest->id);
                }
            }

            return response()->json(['message' => 'Conversation marked as read.']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('markConversationRead error: ' . $e->getMessage());
            return response()->json(['message' => 'Conversation marked as read.']);
        }
    }

    public function typing(Request $request)
    {
        $request->validate([
            'conversation_id' => 'required|integer',
            'typing' => 'required|boolean',
        ]);

        $this->chatService->sendTypingIndicator(
            $request->user()->id,
            $request->conversation_id,
            $request->typing
        );

        return response()->json(['status' => 'ok']);
    }

    public function startDirectChat(Request $request)
    {
        $request->validate([
            'friend_id' => 'required|integer',
        ]);

        $conv = $this->conversationRepository->findOrCreateDirectConversation(
            $request->user()->id,
            $request->friend_id
        );

        // Load members list
        $conv->load('members');

        return response()->json($conv);
    }

    public function startGroupChat(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'member_ids' => 'required|array',
            'member_ids.*' => 'integer',
        ]);

        $conv = $this->conversationRepository->createGroupConversation(
            $request->name,
            $request->user()->id,
            $request->member_ids
        );

        $conv->load('members');

        return response()->json($conv);
    }

    public function clearChat(Request $request, $id)
    {
        $user = $request->user();
        $conversationId = (int)$id;

        $request->validate([
            // clear = hide message history; delete = also hide chat from list
            'mode' => 'nullable|in:clear,delete',
        ]);

        $mode = $request->input('mode', 'clear');

        $member = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $effectAt = now();
        $previousClearedAt = $member->cleared_at;
        $previousHiddenAt = $member->hidden_at;
        $update = ['cleared_at' => $effectAt];
        if ($mode === 'delete') {
            $update['hidden_at'] = $effectAt;
        }
        $member->update($update);

        // Soft-delete only: messages & attachments stay on server so admins can restore.
        \App\Models\ChatSoftDeletion::create([
            'conversation_id' => $conversationId,
            'user_id' => $user->id,
            'action' => $mode === 'delete' ? 'delete' : 'clear',
            'effect_at' => $effectAt,
            'meta' => [
                'previous_cleared_at' => $previousClearedAt,
                'previous_hidden_at' => $previousHiddenAt,
            ],
        ]);

        \App\Models\AuditLog::create([
            'user_id' => $user->id,
            'action' => $mode === 'delete' ? 'chat.delete_soft' : 'chat.clear_soft',
            'resource_type' => 'conversation',
            'resource_id' => (string) $conversationId,
            'old_values' => null,
            'new_values' => ['mode' => $mode, 'effect_at' => $effectAt->toIso8601String()],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => $mode === 'delete'
                ? 'Chat deleted successfully (recoverable by admin).'
                : 'Chat cleared successfully (recoverable by admin).',
        ]);
    }

    public function updateGroup(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'avatar_url' => 'sometimes|nullable|string',
            'avatar_thumb_url' => 'sometimes|nullable|string',
        ]);

        $user = $request->user();
        $conversationId = (int)$id;

        // Verify user is a member of this conversation
        $member = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups can be updated.'], 400);
        }

        $data = $request->only(['name', 'description', 'avatar_url', 'avatar_thumb_url']);
        $conv->update($data);

        return response()->json($conv->load('members'));
    }

    public function uploadGroupAvatar(Request $request, $id)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $user = $request->user();
        $conversationId = (int)$id;

        // Verify member
        $member = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups can have avatars uploaded.'], 400);
        }

        // Delete old avatar file if stored locally
        if ($conv->avatar_url) {
            $oldPath = str_replace(url('storage/') . '/', '', $conv->avatar_url);
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($oldPath)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
        }

        $file = $request->file('avatar');
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = time() . '_' . uniqid();
        $originalName = "{$filename}.{$extension}";
        $dir = "avatars/groups/{$conversationId}";

        $path = $file->storeAs($dir, $originalName, 'public');
        $avatarUrl = url("storage/{$dir}/{$originalName}");

        $conv->update([
            'avatar_url' => $avatarUrl,
            'avatar_thumb_url' => $avatarUrl,
        ]);

        return response()->json($conv->load('members'));
    }

    public function removeMember(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|integer',
        ]);

        $caller = $request->user();
        $conversationId = (int)$id;
        $targetUserId = (int)$request->user_id;

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups support member removal.'], 400);
        }

        $callerMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $caller->id)
            ->first();

        if (!$callerMember || $callerMember->role !== 'admin') {
            return response()->json(['message' => 'Only group admins can remove members.'], 403);
        }

        \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $targetUserId)
            ->delete();

        $targetUser = \App\Models\User::find($targetUserId);
        $targetName = $targetUser ? $targetUser->name : 'Member';

        $conv->load('members');

        return response()->json([
            'message' => "{$targetName} was removed from the group.",
            'conversation' => $conv,
        ]);
    }

    public function leaveGroup(Request $request, $id)
    {
        $user = $request->user();
        $conversationId = (int)$id;

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups can be left.'], 400);
        }

        $member = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member) {
            return response()->json(['message' => 'You are not a member of this group.'], 400);
        }

        $wasAdmin = $member->role === 'admin';
        $member->delete();

        if ($wasAdmin) {
            $nextMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)->first();
            if ($nextMember) {
                $nextMember->update(['role' => 'admin']);
            }
        }

        return response()->json([
            'message' => 'You have left the group.',
        ]);
    }

    public function addMembers(Request $request, $id)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer',
        ]);

        $caller = $request->user();
        $conversationId = (int)$id;

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups support adding members.'], 400);
        }

        $callerMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $caller->id)
            ->first();

        if (!$callerMember) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        foreach ($request->user_ids as $uid) {
            \App\Models\ConversationMember::firstOrCreate([
                'conversation_id' => $conversationId,
                'user_id' => (int)$uid,
            ], [
                'role' => 'member',
                'joined_at' => now(),
            ]);
        }

        $conv->load('members');
        return response()->json([
            'message' => 'Members added successfully.',
            'conversation' => $conv,
        ]);
    }

    public function myPendingRestores(Request $request)
    {
        $user = $request->user();

        $clearedMembers = \App\Models\ConversationMember::with(['conversation.members'])
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereNotNull('cleared_at')->orWhereNotNull('hidden_at');
            })
            ->get();

        $restores = $clearedMembers->map(function ($m) {
            return [
                'conversation_id' => $m->conversation_id,
                'conversation_name' => $m->conversation?->name ?? 'Direct Chat',
                'type' => $m->conversation?->type,
                'cleared_at' => $m->cleared_at,
                'hidden_at' => $m->hidden_at,
            ];
        });

        return response()->json([
            'count' => $restores->count(),
            'restores' => $restores,
        ]);
    }

    public function myRestore(Request $request)
    {
        $request->validate([
            'mode' => 'required|in:full,from_date,date_range',
            'from_date' => 'required_if:mode,from_date,date_range|nullable|date',
            'to_date' => 'required_if:mode,date_range|nullable|date|after_or_equal:from_date',
            'conversation_ids' => 'nullable|array',
            'conversation_ids.*' => 'integer',
        ]);

        $user = $request->user();
        $mode = $request->input('mode', 'full');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $conversationIds = $request->input('conversation_ids');

        $query = \App\Models\ConversationMember::where('user_id', $user->id);
        if (!empty($conversationIds)) {
            $query->whereIn('conversation_id', $conversationIds);
        }

        $members = $query->get();
        $restoredCount = 0;

        foreach ($members as $member) {
            if ($mode === 'full') {
                $member->update([
                    'cleared_at' => null,
                    'hidden_at' => null,
                ]);
            } else {
                $boundary = \Carbon\Carbon::parse($fromDate)->startOfDay()->subSecond();
                $member->update([
                    'cleared_at' => $boundary,
                    'hidden_at' => null,
                ]);
            }

            $deletionQuery = \App\Models\ChatSoftDeletion::where('conversation_id', $member->conversation_id)
                ->where('user_id', $user->id)
                ->pending();

            if ($mode === 'date_range' && $fromDate && $toDate) {
                $start = \Carbon\Carbon::parse($fromDate)->startOfDay();
                $end = \Carbon\Carbon::parse($toDate)->endOfDay();
                $deletionQuery->whereBetween('created_at', [$start, $end]);
            }

            $deletionQuery->update([
                'restored_at' => now(),
                'restored_by' => $user->id,
            ]);

            $restoredCount++;
        }

        return response()->json([
            'message' => 'Chat history restored successfully.',
            'restored_count' => $restoredCount,
        ]);
    }

    public function removeMember(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|integer',
        ]);

        $caller = $request->user();
        $conversationId = (int)$id;
        $targetUserId = (int)$request->user_id;

        $callerMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $caller->id)
            ->first();

        if (!$callerMember || $callerMember->role !== 'admin') {
            return response()->json(['message' => 'Only group admins can remove members.'], 403);
        }

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups support member removal.'], 400);
        }

        \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $targetUserId)
            ->delete();

        $conv->touch();

        return response()->json([
            'message' => 'Member removed successfully.',
            'conversation' => $conv->load('members'),
        ]);
    }

    public function leaveGroup(Request $request, $id)
    {
        $caller = $request->user();
        $conversationId = (int)$id;

        $callerMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $caller->id)
            ->first();

        if (!$callerMember) {
            return response()->json(['message' => 'You are not a member of this group.'], 404);
        }

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups can be left.'], 400);
        }

        if ($callerMember->role === 'admin') {
            $otherMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
                ->where('user_id', '!=', $caller->id)
                ->first();
            if ($otherMember) {
                $otherMember->update(['role' => 'admin']);
            }
        }

        $callerMember->delete();
        $conv->touch();

        return response()->json(['message' => 'You left the group successfully.']);
    }

    public function addMembers(Request $request, $id)
    {
        $caller = $request->user();
        $conversationId = (int)$id;

        $callerMember = \App\Models\ConversationMember::where('conversation_id', $conversationId)
            ->where('user_id', $caller->id)
            ->first();

        if (!$callerMember) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $conv = \App\Models\Conversation::findOrFail($conversationId);
        if ($conv->type !== 'group') {
            return response()->json(['message' => 'Only groups can add members.'], 400);
        }

        $rawIds = $request->input('member_ids') ?? $request->input('user_ids') ?? [];
        if (!is_array($rawIds) || empty($rawIds)) {
            return response()->json(['message' => 'Please select at least one member to add.'], 422);
        }

        $addedIds = [];
        foreach ($rawIds as $mId) {
            $mId = (int)$mId;
            if ($mId <= 0) continue;

            $existing = \App\Models\ConversationMember::where('conversation_id', $conversationId)
                ->where('user_id', $mId)
                ->first();
            if (!$existing) {
                \App\Models\ConversationMember::create([
                    'conversation_id' => $conversationId,
                    'user_id' => $mId,
                    'role' => 'member',
                ]);
                $addedIds[] = $mId;
            }
        }

        $conv->touch();

        return response()->json([
            'message' => count($addedIds) . ' member(s) added successfully.',
            'added_ids' => $addedIds,
            'conversation' => $conv->load('members'),
        ]);
    }
}
