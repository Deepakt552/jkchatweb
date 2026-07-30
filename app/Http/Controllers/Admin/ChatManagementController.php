<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ChatSoftDeletion;
use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Message;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChatManagementController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->get('tab', 'active'); // active | cleared | deleted
        $from = $request->get('from');
        $to = $request->get('to');
        $search = $request->get('search');

        $privacyMode = Setting::getVal('privacy_mode_enabled', true);

        if ($tab === 'deleted') {
            // Admin soft-wiped conversations
            $conversations = Conversation::onlyTrashed()
                ->with(['members', 'deletedByUser'])
                ->withCount('messages')
                ->when($from, fn ($q) => $q->where('deleted_at', '>=', Carbon::parse($from)->startOfDay()))
                ->when($to, fn ($q) => $q->where('deleted_at', '<=', Carbon::parse($to)->endOfDay()))
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhereHas('members', fn ($m) => $m->where('name', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%"));
                    });
                })
                ->orderByDesc('deleted_at')
                ->paginate(15)
                ->withQueryString();
        } elseif ($tab === 'cleared') {
            // Conversations users have cleared/deleted (still recoverable)
            $conversations = Conversation::with(['members', 'conversationMembers.user'])
                ->withCount('messages')
                ->whereHas('conversationMembers', function ($q) use ($from, $to) {
                    $q->where(function ($inner) {
                        $inner->whereNotNull('cleared_at')->orWhereNotNull('hidden_at');
                    })
                        ->when($from, function ($qq) use ($from) {
                            $qq->where(function ($w) use ($from) {
                                $start = Carbon::parse($from)->startOfDay();
                                $w->where('cleared_at', '>=', $start)
                                    ->orWhere('hidden_at', '>=', $start);
                            });
                        })
                        ->when($to, function ($qq) use ($to) {
                            $qq->where(function ($w) use ($to) {
                                $end = Carbon::parse($to)->endOfDay();
                                $w->where('cleared_at', '<=', $end)
                                    ->orWhere('hidden_at', '<=', $end);
                            });
                        });
                })
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhereHas('members', fn ($m) => $m->where('name', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%"));
                    });
                })
                ->orderByDesc('updated_at')
                ->paginate(15)
                ->withQueryString();

            // Attach latest soft-deletion events per conversation
            $conversations->getCollection()->transform(function ($conv) {
                $pending = ChatSoftDeletion::with('user')
                    ->where('conversation_id', $conv->id)
                    ->pending()
                    ->orderByDesc('created_at')
                    ->get();
                $conv->soft_deletions = $pending;
                $conv->cleared_members = $conv->conversationMembers
                    ->filter(fn ($m) => $m->cleared_at || $m->hidden_at)
                    ->map(fn ($m) => [
                        'user_id' => $m->user_id,
                        'name' => $m->user?->name,
                        'username' => $m->user?->username,
                        'cleared_at' => $m->cleared_at,
                        'hidden_at' => $m->hidden_at,
                    ])
                    ->values();

                return $conv;
            });
        } else {
            $conversations = Conversation::with(['members'])
                ->withCount('messages')
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($inner) use ($search) {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhereHas('members', fn ($m) => $m->where('name', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%"));
                    });
                })
                ->orderByDesc('updated_at')
                ->paginate(15)
                ->withQueryString();
        }

        $stats = [
            'active' => Conversation::count(),
            'cleared' => Conversation::whereHas('conversationMembers', function ($q) {
                $q->whereNotNull('cleared_at')->orWhereNotNull('hidden_at');
            })->count(),
            'deleted' => Conversation::onlyTrashed()->count(),
            'pending_restores' => ChatSoftDeletion::pending()->count(),
        ];

        return Inertia::render('admin/Chats', [
            'conversations' => $conversations,
            'privacyMode' => $privacyMode,
            'tab' => $tab,
            'filters' => [
                'from' => $from,
                'to' => $to,
                'search' => $search,
            ],
            'stats' => $stats,
        ]);
    }

    public function show($id)
    {
        $conversation = Conversation::withTrashed()->with('members')->findOrFail($id);
        $privacyMode = Setting::getVal('privacy_mode_enabled', true);

        $messages = Message::where('conversation_id', $id)
            ->with('sender')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($msg) use ($privacyMode) {
                if ($privacyMode) {
                    $msg->body = '[Encrypted Payload - Content Hidden]';
                }

                return $msg;
            });

        $members = ConversationMember::with('user')
            ->where('conversation_id', $id)
            ->get()
            ->map(fn ($m) => [
                'user_id' => $m->user_id,
                'name' => $m->user?->name,
                'username' => $m->user?->username,
                'cleared_at' => $m->cleared_at,
                'hidden_at' => $m->hidden_at,
            ]);

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
            'members' => $members,
            'privacyMode' => $privacyMode,
        ]);
    }

    public function destroyMessage(Request $request, $id)
    {
        $message = Message::findOrFail($id);
        
        // Save original body into MessageEdit before replacing
        \App\Models\MessageEdit::create([
            'message_id' => $message->id,
            'old_body' => $message->body,
            'new_body' => '[This message was deleted by admin]',
            'edited_at' => now(),
        ]);

        // Soft content-delete (keep row for audit / possible restore)
        $message->update([
            'is_deleted' => true,
            'body' => '[This message was deleted by admin]',
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'message.admin_soft_delete',
            'resource_type' => 'message',
            'resource_id' => (string) $id,
            'old_values' => ['body' => $message->body],
            'new_values' => ['is_deleted' => true],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Message soft-deleted successfully by admin.']);
    }

    public function restoreMessage(Request $request, $id)
    {
        $message = Message::findOrFail($id);
        
        // Find latest MessageEdit to recover original body
        $edit = \App\Models\MessageEdit::where('message_id', $message->id)
            ->orderByDesc('id')
            ->first();

        $restoredBody = $edit ? $edit->old_body : $message->body;

        $message->update([
            'is_deleted' => false,
            'body' => $restoredBody,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'message.admin_restore',
            'resource_type' => 'message',
            'resource_id' => (string) $id,
            'old_values' => ['is_deleted' => true],
            'new_values' => ['is_deleted' => false, 'body' => $restoredBody],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Message restored successfully.',
            'restored_body' => $restoredBody,
        ]);
    }

    public function destroyConversation(Request $request, $id)
    {
        $conversation = Conversation::findOrFail($id);
        $conversation->update([
            'deleted_by' => $request->user()->id,
            'delete_reason' => $request->input('reason', 'admin_wipe'),
        ]);
        $conversation->delete(); // SoftDeletes

        ChatSoftDeletion::create([
            'conversation_id' => $conversation->id,
            'user_id' => $request->user()->id,
            'action' => 'admin_wipe',
            'effect_at' => now(),
            'meta' => ['reason' => $request->input('reason', 'admin_wipe')],
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'chat.admin_soft_wipe',
            'resource_type' => 'conversation',
            'resource_id' => (string) $id,
            'old_values' => null,
            'new_values' => ['soft_deleted' => true],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Conversation soft-deleted. It can be restored later.');
    }

    /**
     * Restore a cleared/deleted chat for users.
     *
     * Modes:
     *  - full: clear all cleared_at / hidden_at, restore soft-deleted conversation
     *  - from_date: set cleared_at to (from_date - 1s) so messages after that date reappear
     */
    public function restore(Request $request, $id)
    {
        $data = $request->validate([
            'mode' => 'required|in:full,from_date,date_range',
            'from_date' => 'required_if:mode,from_date,date_range|nullable|date',
            'to_date' => 'required_if:mode,date_range|nullable|date|after_or_equal:from_date',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'integer',
            'restore_conversation' => 'nullable|boolean',
        ]);

        $conversation = Conversation::withTrashed()->findOrFail($id);
        $admin = $request->user();

        if (($data['restore_conversation'] ?? true) && $conversation->trashed()) {
            $conversation->restore();
            $conversation->update([
                'deleted_by' => null,
                'delete_reason' => null,
            ]);
        }

        $membersQuery = ConversationMember::where('conversation_id', $id);
        if (! empty($data['user_ids'])) {
            $membersQuery->whereIn('user_id', $data['user_ids']);
        }
        $members = $membersQuery->get();

        if ($data['mode'] === 'full') {
            foreach ($members as $member) {
                $member->update([
                    'cleared_at' => null,
                    'hidden_at' => null,
                ]);
            }
        } else {
            // Messages are visible when created_at > cleared_at.
            // Setting cleared_at just before from_date restores history from that date onward.
            $boundary = Carbon::parse($data['from_date'])->startOfDay()->subSecond();
            foreach ($members as $member) {
                $member->update([
                    'cleared_at' => $boundary,
                    'hidden_at' => null, // unhide chat in list
                ]);
            }
        }

        // Un-delete soft-deleted messages in this conversation so they reappear
        $messagesQuery = Message::where('conversation_id', $id)->where('is_deleted', true);
        if ($data['mode'] === 'date_range' && !empty($data['from_date']) && !empty($data['to_date'])) {
            $start = Carbon::parse($data['from_date'])->startOfDay();
            $end = Carbon::parse($data['to_date'])->endOfDay();
            $messagesQuery->whereBetween('created_at', [$start, $end]);
        }
        $deletedMsgs = $messagesQuery->get();
        foreach ($deletedMsgs as $msg) {
            $edit = MessageEdit::where('message_id', $msg->id)->orderByDesc('id')->first();
            $restoredBody = $edit ? $edit->old_body : $msg->body;
            $msg->update([
                'is_deleted' => false,
                'body' => $restoredBody,
            ]);
        }

        // Mark pending soft-deletion records as restored
        $deletionQuery = ChatSoftDeletion::pending()->where('conversation_id', $id);
        if (! empty($data['user_ids'])) {
            $deletionQuery->where(function ($q) use ($data) {
                $q->whereIn('user_id', $data['user_ids'])
                    ->orWhere('action', 'admin_wipe');
            });
        }
        if ($data['mode'] === 'date_range' && !empty($data['from_date']) && !empty($data['to_date'])) {
            $start = Carbon::parse($data['from_date'])->startOfDay();
            $end = Carbon::parse($data['to_date'])->endOfDay();
            $deletionQuery->whereBetween('created_at', [$start, $end]);
        }
        $deletionQuery->update([
            'restored_at' => now(),
            'restored_by' => $admin->id,
        ]);

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'chat.admin_restore',
            'resource_type' => 'conversation',
            'resource_id' => (string) $id,
            'old_values' => null,
            'new_values' => [
                'mode' => $data['mode'],
                'from_date' => $data['from_date'] ?? null,
                'to_date' => $data['to_date'] ?? null,
                'user_ids' => $data['user_ids'] ?? 'all',
            ],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json([
                'message' => 'Chat restored successfully for the selected users.',
                'conversation_id' => (int) $id,
            ]);
        }

        return redirect()->back()->with('success', 'Chat restored successfully.');
    }

    /**
     * Bulk restore by date range of clear/delete events.
     */
    public function bulkRestore(Request $request)
    {
        $data = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'mode' => 'nullable|in:full,from_date',
            'actions' => 'nullable|array',
            'actions.*' => 'in:clear,delete,admin_wipe',
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        $to = Carbon::parse($data['to'])->endOfDay();
        $mode = $data['mode'] ?? 'full';
        $actions = $data['actions'] ?? ['clear', 'delete', 'admin_wipe'];

        $events = ChatSoftDeletion::pending()
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('action', $actions)
            ->get();

        $conversationIds = $events->pluck('conversation_id')->unique()->values();
        $restoredCount = 0;

        foreach ($conversationIds as $convId) {
            $conversation = Conversation::withTrashed()->find($convId);
            if (! $conversation) {
                continue;
            }

            if ($conversation->trashed()) {
                $conversation->restore();
                $conversation->update(['deleted_by' => null, 'delete_reason' => null]);
            }

            if ($mode === 'full') {
                ConversationMember::where('conversation_id', $convId)->update([
                    'cleared_at' => null,
                    'hidden_at' => null,
                ]);
            } else {
                $boundary = $from->copy()->subSecond();
                ConversationMember::where('conversation_id', $convId)->update([
                    'cleared_at' => $boundary,
                    'hidden_at' => null,
                ]);
            }

            ChatSoftDeletion::pending()
                ->where('conversation_id', $convId)
                ->whereBetween('created_at', [$from, $to])
                ->update([
                    'restored_at' => now(),
                    'restored_by' => $request->user()->id,
                ]);

            $restoredCount++;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'chat.admin_bulk_restore',
            'resource_type' => 'conversation',
            'resource_id' => 'bulk',
            'old_values' => null,
            'new_values' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'mode' => $mode,
                'restored_conversations' => $restoredCount,
            ],
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return redirect()->back()->with('success', "Restored {$restoredCount} conversation(s) from the selected date range.");
    }
}
