<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Alter Users table to add messaging/profile fields
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->string('avatar_url')->nullable()->after('password');
            $table->string('about')->nullable()->after('avatar_url');
            $table->string('department')->nullable()->after('about');
            $table->string('designation')->nullable()->after('department');
            $table->enum('online_status', ['online', 'offline', 'away'])->default('offline')->after('designation');
            $table->timestamp('last_seen_at')->nullable()->after('online_status');
            $table->json('privacy_settings')->nullable()->after('last_seen_at');
            $table->boolean('is_enabled')->default(true)->after('privacy_settings');
            $table->boolean('is_suspended')->default(false)->after('is_enabled');
            $table->boolean('force_password_change')->default(false)->after('is_suspended');
            $table->string('temp_password')->nullable()->after('force_password_change');
            $table->boolean('is_admin')->default(false)->after('temp_password');
        });

        // 2. Friend Requests
        Schema::create('friend_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiver_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['pending', 'accepted', 'rejected', 'ignored'])->default('pending');
            $table->timestamps();
            $table->unique(['sender_id', 'receiver_id']);
        });

        // 3. Friends
        Schema::create('friends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('friend_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'friend_id']);
        });

        // 4. Blocked Users
        Schema::create('blocked_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('blocked_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['blocker_id', 'blocked_id']);
        });

        // 5. Conversations
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable(); // null for direct 1-to-1 chats
            $table->enum('type', ['direct', 'group'])->default('direct');
            $table->string('avatar_url')->nullable();
            $table->string('encryption_key_hash')->nullable(); // Hash verification for client key
            $table->timestamps();
        });

        // 6. Conversation Members
        Schema::create('conversation_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('role', ['admin', 'member'])->default('member');
            $table->timestamp('joined_at')->useCurrent();
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->timestamps();
            $table->unique(['conversation_id', 'user_id']);
        });

        // 7. Messages
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['text', 'emoji', 'image', 'document', 'code'])->default('text');
            $table->longText('body'); // Encrypted text payload (AES-256-GCM ciphertext)
            $table->string('iv')->nullable(); // AES encryption IV
            $table->boolean('is_edited')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });

        // 8. Message Edits
        Schema::create('message_edits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->onDelete('cascade');
            $table->longText('old_body');
            $table->longText('new_body');
            $table->timestamp('edited_at')->useCurrent();
        });

        // 9. Message Reads (Delivered & Seen Receipts)
        Schema::create('message_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['message_id', 'user_id']);
        });

        // 10. Attachments
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->onDelete('cascade');
            $table->string('file_path'); // Encrypted storage file path
            $table->string('file_name');
            $table->unsignedBigInteger('file_size');
            $table->string('file_mime');
            $table->string('file_type'); // 'pdf', 'doc', 'image', etc.
            $table->string('encryption_iv'); // AES IV for file decryption
            $table->string('encryption_key')->nullable(); // Encrypted key for file
            $table->timestamps();
        });

        // 11. Downloads
        Schema::create('downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('attachment_id')->constrained('attachments')->onDelete('cascade');
            $table->enum('status', ['pending', 'downloading', 'completed', 'failed'])->default('pending');
            $table->unsignedInteger('progress')->default(0);
            $table->string('local_file_path')->nullable();
            $table->timestamps();
        });

        // 12. Device Registrations
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('device_identifier')->unique();
            $table->string('name');
            $table->string('token')->nullable(); // Push notification token
            $table->string('os');
            $table->boolean('is_verified')->default(false);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
        });

        // 13. Backups
        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('file_path');
            $table->unsignedBigInteger('size');
            $table->string('checksum');
            $table->enum('status', ['success', 'failed'])->default('success');
            $table->timestamps();
        });

        // 14. Backup Versions
        Schema::create('backup_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('backup_id')->constrained('backups')->onDelete('cascade');
            $table->string('version');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 15. Login History
        Schema::create('login_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('username_or_email');
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['success', 'failed']);
            $table->string('failed_reason')->nullable();
            $table->timestamp('login_at')->useCurrent();
        });

        // 16. Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('description');
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // 17. Settings
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->string('group');
            $table->string('description')->nullable();
            $table->string('type')->default('string');
            $table->timestamps();
        });

        // 18. Audit Logs (Admin edits, config overrides, blocks, etc.)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action');
            $table->string('resource_type');
            $table->string('resource_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('login_history');
        Schema::dropIfExists('backup_versions');
        Schema::dropIfExists('backups');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('downloads');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('message_reads');
        Schema::dropIfExists('message_edits');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_members');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('blocked_users');
        Schema::dropIfExists('friends');
        Schema::dropIfExists('friend_requests');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'username',
                'avatar_url',
                'about',
                'department',
                'designation',
                'online_status',
                'last_seen_at',
                'privacy_settings',
                'is_enabled',
                'is_suspended',
                'force_password_change',
                'temp_password'
            ]);
        });
    }
};
