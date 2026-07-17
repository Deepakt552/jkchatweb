<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    Route::get('/', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

Route::get('/dashboard', function () {
    return redirect('/');
});

// Admin Dashboard Routes
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\ChatManagementController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\LogController;

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // User management
    Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
    Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
    Route::patch('/users/{id}', [UserManagementController::class, 'update'])->name('users.update');
    Route::delete('/users/{id}', [UserManagementController::class, 'destroy'])->name('users.destroy');
    Route::post('/users/{id}/toggle-status', [UserManagementController::class, 'toggleStatus'])->name('users.toggle-status');
    Route::post('/users/{id}/toggle-suspension', [UserManagementController::class, 'toggleSuspension'])->name('users.toggle-suspension');
    Route::post('/users/{id}/force-reset', [UserManagementController::class, 'forcePasswordReset'])->name('users.force-reset');
    Route::post('/users/{id}/logout-remote', [UserManagementController::class, 'logoutRemote'])->name('users.logout-remote');
    Route::post('/users/{id}/reset-devices', [UserManagementController::class, 'resetDevices'])->name('users.reset-devices');
    Route::post('/users/import', [UserManagementController::class, 'importCSV'])->name('users.import');
    Route::get('/users/export', [UserManagementController::class, 'exportCSV'])->name('users.export');

    // Chat management (soft-delete + admin restore)
    Route::get('/chats', [ChatManagementController::class, 'index'])->name('chats.index');
    Route::post('/chats/bulk-restore', [ChatManagementController::class, 'bulkRestore'])->name('chats.bulk-restore');
    Route::post('/chats/{id}/restore', [ChatManagementController::class, 'restore'])->name('chats.restore');
    Route::get('/chats/{id}', [ChatManagementController::class, 'show'])->name('chats.show');
    Route::delete('/messages/{id}', [ChatManagementController::class, 'destroyMessage'])->name('messages.destroy');
    Route::delete('/chats/{id}', [ChatManagementController::class, 'destroyConversation'])->name('chats.destroy');

    // Settings
    Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    Route::post('/settings', [SettingController::class, 'update'])->name('settings.update');

    // Security logs
    Route::get('/security', [LogController::class, 'index'])->name('security.index');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

// Session-authorized endpoints for the React Web Chat Client
Route::middleware(['auth'])->prefix('web')->group(function () {
    // Friends Management
    Route::get('/friends', [\App\Http\Controllers\Api\ApiFriendController::class, 'index']);
    Route::get('/friends/pending', [\App\Http\Controllers\Api\ApiFriendController::class, 'pending']);
    Route::get('/friends/sent', [\App\Http\Controllers\Api\ApiFriendController::class, 'sent']);
    Route::post('/friends/send', [\App\Http\Controllers\Api\ApiFriendController::class, 'send']);
    Route::post('/friends/accept', [\App\Http\Controllers\Api\ApiFriendController::class, 'accept']);
    Route::post('/friends/reject', [\App\Http\Controllers\Api\ApiFriendController::class, 'reject']);
    Route::post('/friends/search', [\App\Http\Controllers\Api\ApiFriendController::class, 'search']);
    Route::get('/friends/profile/{userId}', [\App\Http\Controllers\Api\ApiFriendController::class, 'getContactProfile']);

    // Conversations & Messaging
    Route::get('/conversations', [\App\Http\Controllers\Api\ApiChatController::class, 'conversations']);
    Route::get('/conversations/{id}/messages', [\App\Http\Controllers\Api\ApiChatController::class, 'messages']);
    Route::post('/messages/send', [\App\Http\Controllers\Api\ApiChatController::class, 'sendMessage']);
    Route::post('/messages/{id}/edit', [\App\Http\Controllers\Api\ApiChatController::class, 'editMessage']);
    Route::post('/messages/{id}/delete', [\App\Http\Controllers\Api\ApiChatController::class, 'deleteMessage']);
    Route::post('/messages/receipt', [\App\Http\Controllers\Api\ApiChatController::class, 'readReceipt']);
    Route::post('/conversations/{id}/mark-read', [\App\Http\Controllers\Api\ApiChatController::class, 'markConversationRead']);
    Route::post('/conversations/{id}/clear', [\App\Http\Controllers\Api\ApiChatController::class, 'clearChat']);
    Route::post('/messages/typing', [\App\Http\Controllers\Api\ApiChatController::class, 'typing']);
    Route::post('/conversations/direct', [\App\Http\Controllers\Api\ApiChatController::class, 'startDirectChat']);
    Route::post('/conversations/{id}/update', [\App\Http\Controllers\Api\ApiChatController::class, 'updateGroup']);
    Route::post('/conversations/{id}/avatar', [\App\Http\Controllers\Api\ApiChatController::class, 'uploadGroupAvatar']);

    // Chunk File Attachments
    Route::post('/files/upload-chunk', [\App\Http\Controllers\Api\ApiFileController::class, 'uploadChunk']);
    Route::get('/files/download/{id}', [\App\Http\Controllers\Api\ApiFileController::class, 'download']);

    // Profile Settings
    Route::get('/profile', [\App\Http\Controllers\Api\ApiAuthController::class, 'getProfile']);
    Route::post('/profile/update', [\App\Http\Controllers\Api\ApiAuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [\App\Http\Controllers\Api\ApiAuthController::class, 'uploadAvatar']);
});

Route::middleware(['web', 'auth'])->group(function () {
    \Illuminate\Support\Facades\Broadcast::routes();
});
