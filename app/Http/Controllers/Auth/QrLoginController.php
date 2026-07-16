<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class QrLoginController extends Controller
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    /**
     * Create a new QR login session.
     */
    public function createSession(Request $request)
    {
        $sessionId = Str::uuid()->toString();

        // Store session in cache with a 'pending' status for 5 minutes
        Cache::put("qr_session:{$sessionId}", [
            'status' => 'pending',
            'user_id' => null,
            'device_info' => null,
        ], now()->addMinutes(5));

        return response()->json([
            'session_id' => $sessionId,
        ]);
    }

    /**
     * Poll the status of the QR login session from the web.
     */
    public function pollStatus(Request $request, $sessionId)
    {
        $session = Cache::get("qr_session:{$sessionId}");

        if (!$session) {
            return response()->json(['status' => 'expired'], 410);
        }

        if ($session['status'] === 'authorized') {
            $userId = $session['user_id'];
            $user = User::find($userId);

            if (!$user || !$user->is_enabled || $user->is_suspended) {
                return response()->json(['status' => 'invalid_user'], 403);
            }

            // Log the user into the web session
            Auth::guard('web')->login($user);

            // Regenerate session to prevent session fixation
            $request->session()->regenerate();

            // Clear the cache key since it's consumed
            Cache::forget("qr_session:{$sessionId}");

            // Log login event in audit trails
            $ip = $request->ip() ?? '127.0.0.1';
            $ua = $request->userAgent() ?? 'Web Browser (QR Scan)';
            $this->userService->logLoginAttempt($user->email, $ip, $ua, 'success');
            $this->userService->logActivity($user->id, "User logged in on Web via QR Scan authorization");

            return response()->json([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url,
                ]
            ]);
        }

        return response()->json([
            'status' => 'pending',
        ]);
    }

    /**
     * Authorize a QR session from the mobile app.
     */
    public function authorizeSession(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string',
            'device_name' => 'nullable|string',
            'os' => 'nullable|string',
        ]);

        $sessionId = $request->session_id;
        $sessionKey = "qr_session:{$sessionId}";
        $session = Cache::get($sessionKey);

        if (!$session) {
            return response()->json(['message' => 'QR session has expired or is invalid.'], 404);
        }

        if ($session['status'] !== 'pending') {
            return response()->json(['message' => 'QR session is already processed.'], 400);
        }

        $user = $request->user();

        // Update session in Cache to 'authorized' with user info
        $session['status'] = 'authorized';
        $session['user_id'] = $user->id;
        $session['device_info'] = [
            'name' => $request->input('device_name', 'Mobile App'),
            'os' => $request->input('os', 'Unknown OS'),
        ];

        Cache::put($sessionKey, $session, now()->addMinutes(2)); // keep in cache to let the web client poll it successfully

        $deviceDetail = $request->input('device_name', 'Mobile Device') . ' (' . $request->input('os', 'Unknown') . ')';
        $this->userService->logActivity($user->id, "Approved web browser login via QR scanner from {$deviceDetail}");

        return response()->json([
            'message' => 'Device linked and web session authorized successfully.',
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }
}
