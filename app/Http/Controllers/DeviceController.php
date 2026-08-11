<?php

namespace App\Http\Controllers;

use App\Models\Device;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    /**
     * Get active logged in devices for current user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $devices = Device::where('user_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->get(['id', 'device_identifier', 'name', 'os', 'is_verified', 'last_active_at', 'created_at', 'updated_at']);

        return response()->json([
            'devices' => $devices,
        ]);
    }

    /**
     * Revoke / delete a logged in device session.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $device = Device::where('user_id', $user->id)->where('id', $id)->first();

        if (!$device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        $device->delete();

        return response()->json([
            'message' => 'Device session revoked successfully.',
        ]);
    }
}
