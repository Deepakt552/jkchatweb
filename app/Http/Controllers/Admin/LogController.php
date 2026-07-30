<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoginHistory;
use App\Models\AuditLog;
use App\Models\Device;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LogController extends Controller
{
    public function index()
    {
        $loginHistory = LoginHistory::with('user')
            ->orderBy('id', 'desc')
            ->paginate(15, ['*'], 'logins');

        $auditLogs = AuditLog::with('user')
            ->orderBy('id', 'desc')
            ->paginate(15, ['*'], 'audits');

        $activeDevicesCount = Device::count();

        return Inertia::render('admin/Security', [
            'loginHistory' => $loginHistory,
            'auditLogs' => $auditLogs,
            'activeDevicesCount' => $activeDevicesCount,
        ]);
    }

    public function liveEvents(Request $request)
    {
        $logins = LoginHistory::with('user:id,name,username,avatar_url')
            ->orderBy('id', 'desc')
            ->take(8)
            ->get()
            ->map(function ($l) {
                return [
                    'id' => 'login_' . $l->id,
                    'type' => $l->status === 'success' ? 'login' : 'login_failed',
                    'title' => $l->status === 'success' ? 'User Logged In' : 'Failed Login Attempt',
                    'user' => $l->user ? $l->user->name : ($l->username_or_email ?? 'Unknown User'),
                    'detail' => $l->location ?? "IP: {$l->ip_address}",
                    'time' => $l->login_at ? $l->login_at->toIso8601String() : $l->created_at->toIso8601String(),
                ];
            });

        $audits = AuditLog::with('user:id,name,username,avatar_url')
            ->orderBy('id', 'desc')
            ->take(8)
            ->get()
            ->map(function ($a) {
                $isLogout = str_contains($a->action, 'logout') || str_contains($a->action, 'device.remove');
                return [
                    'id' => 'audit_' . $a->id,
                    'type' => $isLogout ? 'logout' : 'audit',
                    'title' => $isLogout ? 'User Logged Out / App Uninstalled' : ucwords(str_replace(['.', '_'], ' ', $a->action)),
                    'user' => $a->user ? $a->user->name : 'System',
                    'detail' => $a->action,
                    'time' => $a->created_at->toIso8601String(),
                ];
            });

        $merged = $logins->concat($audits)->sortByDesc('time')->values()->take(10);

        return response()->json([
            'events' => $merged,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
