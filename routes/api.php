<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApiAuthController;
use App\Http\Controllers\Api\ApiFriendController;
use App\Http\Controllers\Api\ApiChatController;
use App\Http\Controllers\Api\ApiFileController;
use App\Http\Controllers\Api\ApiBackupController;
use App\Http\Controllers\Api\DeviceTokenController;

Route::post('/login', [ApiAuthController::class, 'login']);
Route::post('/verify-otp', [ApiAuthController::class, 'verifyOtp']);
Route::post('/resend-otp', [ApiAuthController::class, 'resendOtp']);
Route::get('/users/{id}/status', [ApiAuthController::class, 'getUserStatus']);

Route::middleware('auth:sanctum')->group(function () {
    // WebSocket authorization route
    \Illuminate\Support\Facades\Broadcast::routes();

    // Authentication & Session
    Route::post('/qr-login/authorize', [\App\Http\Controllers\Auth\QrLoginController::class, 'authorizeSession']);
    Route::post('/logout', [ApiAuthController::class, 'logout']);
    Route::post('/change-password', [ApiAuthController::class, 'changePassword']);
    Route::get('/profile', [ApiAuthController::class, 'getProfile']);
    Route::post('/profile/update', [ApiAuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [ApiAuthController::class, 'uploadAvatar']);
    Route::get('/devices', [ApiAuthController::class, 'getActiveDevices']);
    Route::post('/devices/logout', [ApiAuthController::class, 'logoutRemoteDevice']);
    Route::post('/devices/logout-all', [ApiAuthController::class, 'logoutAllDevices']);

    // FCM push notification device token registration
    Route::post('/device-token', [DeviceTokenController::class, 'register']);

    // Friend Management
    Route::get('/friends', [ApiFriendController::class, 'index']);
    Route::get('/friends/pending', [ApiFriendController::class, 'pending']);
    Route::get('/friends/sent', [ApiFriendController::class, 'sent']);
    Route::post('/friends/send', [ApiFriendController::class, 'send']);
    Route::post('/friends/accept', [ApiFriendController::class, 'accept']);
    Route::post('/friends/reject', [ApiFriendController::class, 'reject']);
    Route::post('/friends/cancel', [ApiFriendController::class, 'cancel']);
    Route::post('/friends/remove', [ApiFriendController::class, 'remove']);
    Route::post('/friends/block', [ApiFriendController::class, 'block']);
    Route::post('/friends/unblock', [ApiFriendController::class, 'unblock']);
    Route::get('/friends/blocked', [ApiFriendController::class, 'blocked']);
    Route::post('/friends/search', [ApiFriendController::class, 'search']);
    Route::get('/friends/profile/{userId}', [ApiFriendController::class, 'getContactProfile']);

    // Real-Time Chat
    Route::get('/conversations', [ApiChatController::class, 'conversations']);
    Route::get('/conversations/{id}/messages', [ApiChatController::class, 'messages']);
    Route::post('/messages/send', [ApiChatController::class, 'sendMessage']);
    Route::post('/messages/{id}/edit', [ApiChatController::class, 'editMessage']);
    Route::post('/messages/{id}/delete', [ApiChatController::class, 'deleteMessage']);
    Route::post('/messages/receipt', [ApiChatController::class, 'readReceipt']);
    Route::post('/conversations/{id}/mark-read', [ApiChatController::class, 'markConversationRead']);
    Route::post('/messages/typing', [ApiChatController::class, 'typing']);
    Route::post('/conversations/{id}/clear', [ApiChatController::class, 'clearChat']);
    Route::post('/conversations/direct', [ApiChatController::class, 'startDirectChat']);
    Route::post('/conversations/group', [ApiChatController::class, 'startGroupChat']);
    Route::post('/conversations/{id}/update', [ApiChatController::class, 'updateGroup']);
    Route::post('/conversations/{id}/avatar', [ApiChatController::class, 'uploadGroupAvatar']);

    // File Management
    Route::post('/files/upload-chunk', [ApiFileController::class, 'uploadChunk']);
    Route::get('/files/download/{id}', [ApiFileController::class, 'download']);

    // Backup & Restore
    Route::get('/backups', [ApiBackupController::class, 'index']);
    Route::post('/backups/create', [ApiBackupController::class, 'create']);
    Route::get('/backups/{id}/download', [ApiBackupController::class, 'download']);
    Route::delete('/backups/{id}', [ApiBackupController::class, 'destroy']);
});
