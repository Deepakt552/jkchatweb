<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return \App\Models\ConversationMember::where('conversation_id', $conversationId)
        ->where('user_id', $user->id)
        ->exists();
});

// Presence channel — subscribed when the user actively opens a chat screen.
// This allows the FCM push job to skip sending a notification if the user
// is currently viewing that conversation (Reverb already delivered it live).
Broadcast::channel('chat.{conversationId}', function ($user, $conversationId) {
    if (\App\Models\ConversationMember::where('conversation_id', $conversationId)
        ->where('user_id', $user->id)
        ->exists()) {
        return ['id' => $user->id, 'name' => $user->name];
    }
    return false;
});

Broadcast::channel('online-users', function ($user) {
    $user->update([
        'online_status' => 'online',
        'last_seen_at' => now(),
    ]);
    return ['id' => $user->id, 'name' => $user->name];
});
