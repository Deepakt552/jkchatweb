<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Services\BackupService;
use Illuminate\Http\Request;

class ApiBackupController extends Controller
{
    protected BackupService $backupService;

    public function __construct(BackupService $backupService)
    {
        $this->backupService = $backupService;
    }

    public function index(Request $request)
    {
        $backups = Backup::where('user_id', $request->user()->id)
            ->with('versions')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($backups);
    }

    public function create(Request $request)
    {
        $request->validate([
            'encrypted_data' => 'required|string', // Encrypted JSON payload (base64 encoded)
            'checksum' => 'required|string',
        ]);

        $backup = $this->backupService->createBackup(
            $request->user()->id,
            $request->encrypted_data,
            $request->checksum
        );

        return response()->json([
            'message' => 'Backup created successfully.',
            'backup' => $backup,
        ]);
    }

    public function download(Request $request, $backupId)
    {
        $content = $this->backupService->getBackupContent($request->user()->id, (int)$backupId);

        return response()->json([
            'encrypted_data' => $content,
        ]);
    }

    public function destroy(Request $request, $backupId)
    {
        $this->backupService->deleteBackup($request->user()->id, (int)$backupId);
        return response()->json(['message' => 'Backup deleted successfully.']);
    }
}
