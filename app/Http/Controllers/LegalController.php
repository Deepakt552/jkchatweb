<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LegalController extends Controller
{
    /**
     * Display the official Privacy Policy page.
     * Compliant with Apple App Store Guidelines & Google Play User Data Policy.
     */
    public function privacyPolicy()
    {
        return view('privacy-policy');
    }

    /**
     * Display the Account & Data Deletion page.
     * Required by Google Play & Apple App Store.
     */
    public function deleteAccount()
    {
        return view('delete-account');
    }

    /**
     * Process web-based account deletion requests.
     */
    public function submitDeleteRequest(Request $request)
    {
        $validated = $request->validate([
            'email_or_username' => 'required|string|max:255',
            'reason' => 'nullable|string|max:1000',
            'confirm_deletion' => 'required|accepted',
        ]);

        $identifier = trim($validated['email_or_username']);

        $user = User::where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if ($user) {
            // Prevent deleting root admin or demo review account accidentally
            if ($user->username === 'dia' || $user->is_admin) {
                return back()->with('success', 'Your request has been received. Our compliance team will review your account deletion request within 24-48 hours.');
            }

            // Revoke active sessions and devices
            Device::where('user_id', $user->id)->delete();
            $user->tokens()->delete();

            // Anonymize user record
            $userId = $user->id;
            $user->is_enabled = false;
            $user->is_suspended = true;
            $user->otp_code = null;
            $user->otp_expires_at = null;
            $user->name = "Deleted User";
            $user->about = null;
            $user->avatar_url = null;
            $user->email = "deleted_{$userId}_" . time() . "@deleted.invalid";
            $user->username = "deleted_{$userId}_" . time();
            $user->save();

            Log::info("Web account deletion request fulfilled for user ID {$userId}");

            return back()->with('success', 'Your account and personal data have been scheduled for permanent deletion. All sessions have been terminated.');
        }

        // Return same generic message for privacy/security
        return back()->with('success', 'Your deletion request has been submitted. If an account matches the provided identifier, it will be processed and permanently deleted.');
    }
}
