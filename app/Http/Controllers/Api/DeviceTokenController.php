<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DeviceTokenController extends Controller
{
    /**
     * Register or update an FCM device token for the authenticated user.
     * One token per device_id — upserts cleanly.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fcm_token'   => 'required|string',
            'device_type' => 'required|in:android,ios',
            'device_id'   => 'required|string|max:255',
        ]);

        DeviceToken::updateOrCreate(
            ['device_id' => $validated['device_id']],
            [
                'user_id'        => $request->user()->id,
                'fcm_token'      => $validated['fcm_token'],
                'device_type'    => $validated['device_type'],
                'last_active_at' => now(),
            ]
        );

        Log::info('FCM token registered', [
            'user_id'     => $request->user()->id,
            'device_id'   => $validated['device_id'],
            'device_type' => $validated['device_type'],
        ]);

        return response()->json(['message' => 'Token registered.']);
    }
}
