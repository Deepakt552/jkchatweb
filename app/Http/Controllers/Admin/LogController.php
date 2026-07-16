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
}
