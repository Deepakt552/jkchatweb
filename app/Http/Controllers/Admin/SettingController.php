<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        // Fill default values if missing
        $defaults = [
            'app_name' => 'SecureChat Enterprise',
            'file_upload_limit' => '104857600', // 100MB
            'allowed_file_types' => 'pdf,doc,docx,xls,xlsx,zip,rar,txt,png,jpg,jpeg',
            'privacy_mode_enabled' => '1',
            'backup_schedule' => 'daily',
            'maintenance_mode' => '0',
            'smtp_host' => '127.0.0.1',
            'smtp_port' => '2525',
            'smtp_username' => '',
            'smtp_password' => '',
            'smtp_encryption' => 'tls',
        ];

        foreach ($defaults as $key => $val) {
            if (!isset($settings[$key])) {
                $settings[$key] = $val;
            }
        }

        return Inertia::render('admin/Settings', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'app_name' => 'required|string|max:255',
            'file_upload_limit' => 'required|numeric',
            'allowed_file_types' => 'required|string',
            'privacy_mode_enabled' => 'required|boolean',
            'backup_schedule' => 'required|string|in:manual,daily,weekly,monthly',
            'maintenance_mode' => 'required|boolean',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|numeric',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|string',
        ]);

        foreach ($data as $key => $value) {
            $type = 'string';
            if (is_bool($value)) {
                $type = 'boolean';
                $value = $value ? '1' : '0';
            } elseif (is_numeric($value)) {
                $type = 'integer';
            }

            Setting::setVal($key, $value, 'general', $type);
        }

        return redirect()->back()->with('success', 'Settings updated successfully.');
    }
}
