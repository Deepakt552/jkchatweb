<?php

namespace App\Services;

use App\Models\User;
use App\Models\Device;
use App\Models\LoginHistory;
use App\Models\ActivityLog;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserService
{
    protected UserRepositoryInterface $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function createUser(array $data): User
    {
        $password = !empty($data['password']) ? $data['password'] : Str::random(12);
        $isTemp = empty($data['password']);

        $user = $this->userRepository->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $data['username'] ?? null,
            'department' => $data['department'] ?? null,
            'designation' => $data['designation'] ?? null,
            'password' => Hash::make($password),
            'temp_password' => $isTemp ? $password : null, // Temporary password storage for first-time use
            'force_password_change' => $isTemp,
            'is_enabled' => true,
        ]);

        $this->logActivity($user->id, 'User created by admin');

        return $user;
    }

    public function changePassword(int $userId, string $newPassword): bool
    {
        // Enforce password strength policies
        if (strlen($newPassword) < 8) {
            throw ValidationException::withMessages([
                'password' => ['Password must be at least 8 characters long.'],
            ]);
        }

        $user = $this->userRepository->update($userId, [
            'password' => Hash::make($newPassword),
            'temp_password' => null,
            'force_password_change' => false,
        ]);

        $this->logActivity($userId, 'User password changed');

        // Logout from other devices
        $this->logoutFromAllDevices($userId);

        return true;
    }

    public function logoutFromAllDevices(int $userId): void
    {
        $user = $this->userRepository->findById($userId);
        if ($user) {
            $user->tokens()->delete(); // Revoke all Sanctum API tokens
            Device::where('user_id', $userId)->delete();
            $this->logActivity($userId, 'Logged out from all devices');
        }
    }

    public function logoutDevice(int $userId, string $deviceIdentifier): void
    {
        Device::where('user_id', $userId)->where('device_identifier', $deviceIdentifier)->delete();
        $this->logActivity($userId, "Logged out device: {$deviceIdentifier}");
    }

    public function logLoginAttempt(string $login, string $ip, string $userAgent, string $status, ?string $reason = null): void
    {
        $user = $this->userRepository->findByEmailOrUsername($login);

        LoginHistory::create([
            'user_id' => $user?->id,
            'username_or_email' => $login,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'status' => $status,
            'failed_reason' => $reason,
        ]);
    }

    public function logActivity(int $userId, string $description): void
    {
        ActivityLog::create([
            'user_id' => $userId,
            'description' => $description,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'System',
        ]);
    }
}
