<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChatManagementController extends Controller
{
    public function index(Request $request)
    {
        $conversations = Conversation::with(['members'])
            ->withCount('messages')
            ->orderBy('updated_at', 'desc')
            ->paginate(15);

        $privacyMode = Setting::getVal('privacy_mode_enabled', true);

        return Inertia::render('admin/Chats', [
            'conversations' => $conversations,
            'privacyMode' => $privacyMode,
        ]);
    }

    public function show($id)
    {
        $conversation = Conversation::with('members')->findOrFail($id);
        $privacyMode = Setting::getVal('privacy_mode_enabled', true);

        $messagesQuery = Message::where('conversation_id', $id)
            ->with('sender')
            ->orderBy('id', 'asc');

        $messages = $messagesQuery->get()->map(function ($msg) use ($privacyMode) {
            if ($privacyMode) {
                $msg->body = '[Encrypted Payload - Content Hidden]';
            }
            return $msg;
        });

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
            'privacyMode' => $privacyMode,
        ]);
    }

    public function destroyMessage($id)
    {
        $message = Message::findOrFail($id);
        $message->delete();

        return response()->json(['message' => 'Message deleted successfully by admin.']);
    }

    public function destroyConversation($id)
    {
        $conversation = Conversation::findOrFail($id);
        $conversation->delete();

        return redirect()->back()->with('success', 'Conversation deleted successfully.');
    }
}
