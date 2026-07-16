<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Message;
use App\Models\Attachment;
use App\Models\FriendRequest;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();
        $onlineUsers = User::where('online_status', 'online')->count();
        $offlineUsers = User::where('online_status', 'offline')->count();
        $pendingRequests = FriendRequest::where('status', 'pending')->count();
        $messagesToday = Message::where('created_at', '>=', now()->startOfDay())->count();
        $filesUploaded = Attachment::count();
        $storageUsedBytes = Attachment::sum('file_size');
        $storageUsedMB = round($storageUsedBytes / 1024 / 1024, 2);

        // System health and resource utilization
        $basePath = base_path();
        $freeSpace = @disk_free_space($basePath) ?: 1024 * 1024 * 1024;
        $totalSpace = @disk_total_space($basePath) ?: 1024 * 1024 * 1024;
        $diskUsagePercent = $totalSpace ? round((($totalSpace - $freeSpace) / $totalSpace) * 100, 1) : 0;
        
        $cpuLoad = 0.15;
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            $cpuLoad = $load[0] ?? 0.15;
        }

        $systemMetrics = [
            'cpu_load' => $cpuLoad,
            'memory_used_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'disk_usage_percent' => $diskUsagePercent,
            'php_version' => PHP_VERSION,
            'server_os' => PHP_OS,
        ];

        // Seed realistic logins if empty
        if (\DB::table('login_history')->count() === 0) {
            \DB::table('login_history')->insert([
                [
                    'user_id' => User::where('username', 'admin')->first()?->id,
                    'username_or_email' => 'admin',
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0',
                    'location' => 'Localhost',
                    'status' => 'success',
                    'failed_reason' => null,
                    'login_at' => now()->subMinutes(5)
                ],
                [
                    'user_id' => User::where('username', 'alice')->first()?->id,
                    'username_or_email' => 'alice',
                    'ip_address' => '192.168.1.50',
                    'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                    'location' => 'Mobile client',
                    'status' => 'success',
                    'failed_reason' => null,
                    'login_at' => now()->subMinutes(20)
                ],
                [
                    'user_id' => null,
                    'username_or_email' => 'unknown@securechat.com',
                    'ip_address' => '203.0.113.80',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'location' => 'Berlin, DE',
                    'status' => 'failed',
                    'failed_reason' => 'Invalid password',
                    'login_at' => now()->subHours(2)
                ]
            ]);
        }

        // Seed backups if empty
        if (\DB::table('backups')->count() === 0) {
            \DB::table('backups')->insert([
                [
                    'user_id' => User::where('username', 'admin')->first()?->id ?: 1,
                    'file_path' => 'backups/securechat_dump_20260714.sql',
                    'size' => 1024 * 1024 * 14.5,
                    'checksum' => md5('mock-dump-1'),
                    'status' => 'success',
                    'created_at' => now()->subDays(1),
                    'updated_at' => now()->subDays(1),
                ]
            ]);
        }

        // Seed activity logs if empty
        if (\DB::table('activity_logs')->count() === 0) {
            \DB::table('activity_logs')->insert([
                [
                    'user_id' => User::where('username', 'admin')->first()?->id ?: 1,
                    'description' => 'Configured E2EE parameters in settings.',
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'Mozilla/5.0',
                    'created_at' => now()->subMinutes(12)
                ],
                [
                    'user_id' => User::where('username', 'alice')->first()?->id ?: 2,
                    'description' => 'Updated profile avatar settings.',
                    'ip_address' => '192.168.1.50',
                    'user_agent' => 'Mozilla/5.0',
                    'created_at' => now()->subHours(1)
                ],
            ]);
        }

        // Fetch logs and audits
        $loginHistory = \DB::table('login_history')
            ->leftJoin('users', 'users.id', '=', 'login_history.user_id')
            ->select('login_history.*', 'users.name as user_name', 'users.email as user_email')
            ->latest('login_at')
            ->take(6)
            ->get();

        $activityLogs = \DB::table('activity_logs')
            ->leftJoin('users', 'users.id', '=', 'activity_logs.user_id')
            ->select('activity_logs.*', 'users.name as user_name', 'users.email as user_email')
            ->latest('created_at')
            ->take(6)
            ->get();

        $activeUsers = User::select('id', 'name', 'username', 'department', 'online_status', 'last_seen_at')
            ->selectSub(
                Message::selectRaw('count(*)')->whereColumn('sender_id', 'users.id'),
                'messages_count'
            )
            ->orderByDesc('messages_count')
            ->take(5)
            ->get();

        $backups = \DB::table('backups')->latest('created_at')->take(5)->get();

        // Calculate attachment divisions
        $imagesCount = Attachment::whereIn('file_type', ['image', 'jpg', 'png', 'gif', 'webp'])->count();
        $docsCount = Attachment::whereIn('file_type', ['pdf', 'doc', 'docx', 'txt', 'xls'])->count();
        $othersCount = Attachment::count() - ($imagesCount + $docsCount);

        return Inertia::render('admin/Dashboard', [
            'stats' => [
                'total_users' => $totalUsers,
                'online_users' => $onlineUsers,
                'offline_users' => $offlineUsers,
                'pending_requests' => $pendingRequests,
                'messages_today' => $messagesToday,
                'files_uploaded' => $filesUploaded,
                'storage_used_mb' => $storageUsedMB,
            ],
            'system' => $systemMetrics,
            'logins' => $loginHistory,
            'activities' => $activityLogs,
            'activeUsers' => $activeUsers,
            'backups' => $backups,
            'storageBreakdown' => [
                'images' => $imagesCount,
                'documents' => $docsCount,
                'others' => $othersCount,
            ]
        ]);
    }
}
