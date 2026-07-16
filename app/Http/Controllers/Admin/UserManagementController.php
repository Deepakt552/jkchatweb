<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Device;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(Request $request)
    {
        $query = User::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('id', 'desc')->paginate(15)->withQueryString();

        return Inertia::render('admin/Users', [
            'users' => $users,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'username' => 'required|string|max:255|unique:users',
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'is_admin' => 'required|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        $user = $this->userService->createUser($data);

        // Update the admin role flags
        if ($data['is_admin']) {
            $user->update(['is_admin' => true]);
        }

        if ($user->temp_password) {
            return redirect()->back()->with('success', 'User created successfully with temporary password: ' . $user->temp_password);
        }
        return redirect()->back()->with('success', 'User created successfully.');
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'department' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'is_admin' => 'required|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            $data['temp_password'] = null;
            $data['force_password_change'] = false;
        } else {
            unset($data['password']);
        }

        $user->update($data);

        $this->userService->logActivity($user->id, "User updated by admin");

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully.');
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_enabled' => !$user->is_enabled]);

        $status = $user->is_enabled ? 'enabled' : 'disabled';
        $this->userService->logActivity($user->id, "User account {$status} by admin");

        // Always log out from all devices on status change
        $this->userService->logoutFromAllDevices($user->id);

        return redirect()->back()->with('success', "User account has been {$status}.");
    }

    public function toggleSuspension(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_suspended' => !$user->is_suspended]);

        $status = $user->is_suspended ? 'suspended' : 'activated';
        $this->userService->logActivity($user->id, "User account {$status} by admin");

        if ($user->is_suspended) {
            $this->userService->logoutFromAllDevices($user->id);
        }

        return redirect()->back()->with('success', "User account has been {$status}.");
    }

    public function forcePasswordReset($id)
    {
        $user = User::findOrFail($id);
        $tempPassword = Str::random(12);

        $user->update([
            'password' => Hash::make($tempPassword),
            'temp_password' => $tempPassword,
            'force_password_change' => true,
        ]);

        $this->userService->logActivity($user->id, "Forced password reset by admin");
        $this->userService->logoutFromAllDevices($user->id);

        return redirect()->back()->with('success', "Password reset forced. Temporary password: {$tempPassword}");
    }

    public function logoutRemote(Request $request, $id)
    {
        $this->userService->logoutFromAllDevices($id);
        return redirect()->back()->with('success', 'Logged out all user devices.');
    }

    public function resetDevices($id)
    {
        $user = User::findOrFail($id);
        Device::where('user_id', $user->id)->delete();
        
        $this->userService->logActivity($user->id, "Devices reset by admin");
        
        return redirect()->back()->with('success', 'User devices reset successfully.');
    }

    public function importCSV(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        
        // Skip header
        fgetcsv($handle);

        $imported = 0;
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) < 3) continue;

            $name = $row[0];
            $email = $row[1];
            $username = $row[2];
            $department = $row[3] ?? null;
            $designation = $row[4] ?? null;

            if (User::where('email', $email)->orWhere('username', $username)->exists()) {
                continue;
            }

            $this->userService->createUser([
                'name' => $name,
                'email' => $email,
                'username' => $username,
                'department' => $department,
                'designation' => $designation,
            ]);

            $imported++;
        }
        fclose($handle);

        return redirect()->back()->with('success', "Successfully imported {$imported} users.");
    }

    public function exportCSV()
    {
        $headers = [
            "Content-type" => "text/csv",
            "Content-Disposition" => "attachment; filename=users_export_" . now()->timestamp . ".csv",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $users = User::all();

        $callback = function() use($users) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Name', 'Email', 'Username', 'Department', 'Designation', 'Admin', 'Enabled', 'Suspended']);

            foreach ($users as $user) {
                fputcsv($file, [
                    $user->name,
                    $user->email,
                    $user->username,
                    $user->department,
                    $user->designation,
                    $user->is_admin ? 'Yes' : 'No',
                    $user->is_enabled ? 'Yes' : 'No',
                    $user->is_suspended ? 'Yes' : 'No',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
