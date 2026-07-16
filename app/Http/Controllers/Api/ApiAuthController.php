<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Device;
use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ApiAuthController extends Controller
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string', // username or email
            'password' => 'required|string',
            'device_id' => 'required|string',
            'device_name' => 'required|string',
            'os' => 'required|string',
            'push_token' => 'nullable|string',
        ]);

        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->first();

        $ip = $request->ip() ?? '127.0.0.1';
        $ua = $request->userAgent() ?? 'API Client';

        if (!$user || !Hash::check($request->password, $user->password)) {
            $this->userService->logLoginAttempt($request->login, $ip, $ua, 'failed', 'Invalid credentials');
            throw ValidationException::withMessages([
                'login' => ['Invalid username/email or password.'],
            ]);
        }

        if (!$user->is_enabled) {
            $this->userService->logLoginAttempt($request->login, $ip, $ua, 'failed', 'Account disabled');
            throw ValidationException::withMessages([
                'login' => ['Your account is disabled.'],
            ]);
        }

        if ($user->is_suspended) {
            $this->userService->logLoginAttempt($request->login, $ip, $ua, 'failed', 'Account suspended');
            throw ValidationException::withMessages([
                'login' => ['Your account has been suspended.'],
            ]);
        }

        // Generate OTP
        $otp = sprintf("%06d", mt_rand(100000, 999999));
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(5);
        $user->save();

        // Send OTP Mail
        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\OtpMail($otp));

        return response()->json([
            'otp_required' => true,
            'email' => $user->email,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'otp' => 'required|string|size:6',
            'device_id' => 'required|string',
            'device_name' => 'required|string',
            'os' => 'required|string',
            'push_token' => 'nullable|string',
        ]);

        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->first();

        $ip = $request->ip() ?? '127.0.0.1';
        $ua = $request->userAgent() ?? 'API Client';

        if (!$user) {
            throw ValidationException::withMessages([
                'otp' => ['User not found.'],
            ]);
        }

        if (!$user->is_enabled || $user->is_suspended) {
            throw ValidationException::withMessages([
                'otp' => ['Account is disabled or suspended.'],
            ]);
        }

        if (empty($user->otp_code) || empty($user->otp_expires_at) || $user->otp_code !== $request->otp || now()->greaterThan($user->otp_expires_at)) {
            $this->userService->logLoginAttempt($request->login, $ip, $ua, 'failed', 'Invalid or expired OTP');
            throw ValidationException::withMessages([
                'otp' => ['The entered code is invalid or has expired.'],
            ]);
        }

        // Clear OTP on success
        $user->otp_code = null;
        $user->otp_expires_at = null;
        $user->save();

        // Clear out any previous registrations of this device identifier associated with other users
        Device::where('device_identifier', $request->device_id)
            ->where('user_id', '!=', $user->id)
            ->delete();

        // Check if device needs verification or update
        Device::updateOrCreate(
            ['user_id' => $user->id, 'device_identifier' => $request->device_id],
            [
                'name' => $request->device_name,
                'os' => $request->os,
                'token' => $request->push_token,
                'is_verified' => true,
                'last_active_at' => now(),
            ]
        );

        $this->userService->logLoginAttempt($request->login, $ip, $ua, 'success');
        $this->userService->logActivity($user->id, "User logged in on {$request->device_name} ({$request->os}) after OTP verification");

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'force_password_change' => $user->force_password_change,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'avatar_url' => $user->avatar_url,
                'about' => $user->about,
                'department' => $user->department,
                'designation' => $user->designation,
                'online_status' => $user->online_status,
                'privacy_settings' => $user->privacy_settings,
            ]
        ]);
    }

    public function resendOtp(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
        ]);

        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'login' => ['User not found.'],
            ]);
        }

        if (!$user->is_enabled || $user->is_suspended) {
            throw ValidationException::withMessages([
                'login' => ['Account is disabled or suspended.'],
            ]);
        }

        // Generate and save new OTP
        $otp = sprintf("%06d", mt_rand(100000, 999999));
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(5);
        $user->save();

        // Send OTP Mail
        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\OtpMail($otp));

        return response()->json([
            'message' => 'OTP has been resent successfully.',
            'email' => $user->email,
        ]);
    }


    public function changePassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();
        $this->userService->changePassword($user->id, $request->password);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $deviceId = $request->input('device_id');

        if ($deviceId) {
            $this->userService->logoutDevice($user->id, $deviceId);
        }

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function getActiveDevices(Request $request)
    {
        $devices = Device::where('user_id', $request->user()->id)->get();
        return response()->json($devices);
    }

    public function logoutRemoteDevice(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
        ]);

        $user = $request->user();
        $this->userService->logoutDevice($user->id, $request->device_id);

        return response()->json(['message' => 'Device logged out remotely.']);
    }

    public function logoutAllDevices(Request $request)
    {
        $user = $request->user();
        $this->userService->logoutFromAllDevices($user->id);

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    public function getProfile(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'                 => 'sometimes|string|max:255',
            'username'             => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'about'                => 'sometimes|nullable|string|max:1000',
            'status'               => 'sometimes|nullable|string|max:1000',
            'avatar_url'           => 'sometimes|nullable|string',
            'privacy_settings'     => 'sometimes|array',
            'last_seen_visibility' => 'sometimes|string|in:everyone,contacts,nobody',
        ]);

        if (isset($data['status'])) {
            $data['about'] = $data['status'];
            unset($data['status']);
        }

        if (isset($data['last_seen_visibility'])) {
            $privacy = $user->privacy_settings ?? [];
            if (!is_array($privacy)) $privacy = [];
            $privacy['last_seen_visibility'] = $data['last_seen_visibility'];
            $data['privacy_settings'] = $privacy;
            unset($data['last_seen_visibility']);
        }

        $user->update($data);
        $this->userService->logActivity($user->id, 'Profile updated');

        return response()->json(['user' => $user]);
    }

    /**
     * POST /profile/avatar
     * Upload a profile picture image (multipart/form-data, field: avatar).
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120', // 5 MB max
        ]);

        $user = $request->user();

        // Delete old avatar file if stored locally
        if ($user->avatar_url) {
            $oldPath = str_replace(url('storage/') . '/', '', $user->avatar_url);
            $oldThumbPath = preg_replace('/(\.[a-zA-Z0-9]+)$/', '_thumb$1', $oldPath);
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($oldPath)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldPath);
            }
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($oldThumbPath)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($oldThumbPath);
            }
        }

        $file = $request->file('avatar');
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = time() . '_' . uniqid();
        
        $originalName = "{$filename}.{$extension}";
        $thumbName = "{$filename}_thumb.{$extension}";
        
        $dir = "avatars/{$user->id}";
        
        // Save original file
        $path = $file->storeAs($dir, $originalName, 'public');
        $originalFullPath = storage_path('app/public/' . $path);
        $thumbFullPath = storage_path("app/public/{$dir}/{$thumbName}");
        
        // Compress original & create thumbnail
        try {
            $this->compressImageAndCreateThumbnail($originalFullPath, $thumbFullPath, $extension);
        } catch (\Exception $e) {
            // Fallback if compression fails: copy original to thumb
            @copy($originalFullPath, $thumbFullPath);
        }

        $avatarUrl = url("storage/{$dir}/{$originalName}");

        $user->update(['avatar_url' => $avatarUrl]);
        $this->userService->logActivity($user->id, 'Avatar updated');

        return response()->json([
            'avatar_url' => $avatarUrl,
            'user'       => $user,
        ]);
    }

    private function compressImageAndCreateThumbnail(string $sourcePath, string $thumbPath, string $extension)
    {
        switch (strtolower($extension)) {
            case 'jpeg':
            case 'jpg':
                $srcImg = @imagecreatefromjpeg($sourcePath);
                break;
            case 'png':
                $srcImg = @imagecreatefrompng($sourcePath);
                break;
            case 'webp':
                $srcImg = @imagecreatefromwebp($sourcePath);
                break;
            default:
                throw new \Exception('Unsupported image type for compression');
        }

        if (!$srcImg) {
            throw new \Exception('Failed to load image');
        }

        $width = imagesx($srcImg);
        $height = imagesy($srcImg);

        // Compress the original image at 50% quality (overwrite in place)
        $this->saveCompressedImage($srcImg, $sourcePath, $extension, 50);

        // Create Thumbnail (max 150x150 pixels)
        $thumbSize = 150;
        if ($width > $height) {
            $newWidth = $thumbSize;
            $newHeight = (int)($height * ($thumbSize / $width));
        } else {
            $newHeight = $thumbSize;
            $newWidth = (int)($width * ($thumbSize / $height));
        }

        $thumbImg = imagecreatetruecolor($newWidth, $newHeight);
        
        if (in_array(strtolower($extension), ['png', 'webp'])) {
            imagealphablending($thumbImg, false);
            imagesavealpha($thumbImg, true);
            $transparent = imagecolorallocatealpha($thumbImg, 255, 255, 255, 127);
            imagefilledrectangle($thumbImg, 0, 0, $newWidth, $newHeight, $transparent);
        }

        imagecopyresampled($thumbImg, $srcImg, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        $this->saveCompressedImage($thumbImg, $thumbPath, $extension, 50);

        imagedestroy($srcImg);
        imagedestroy($thumbImg);
    }

    private function saveCompressedImage($image, string $path, string $extension, int $quality)
    {
        switch (strtolower($extension)) {
            case 'jpeg':
            case 'jpg':
                imagejpeg($image, $path, $quality);
                break;
            case 'png':
                $pngQuality = (int)((100 - $quality) / 10);
                imagepng($image, $path, $pngQuality);
                break;
            case 'webp':
                imagewebp($image, $path, $quality);
                break;
            default:
                imagejpeg($image, $path, $quality);
        }
    }

    public function getUserStatus($id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        return response()->json([
            'is_enabled' => (bool)$user->is_enabled,
            'is_suspended' => (bool)$user->is_suspended,
        ]);
    }
}
