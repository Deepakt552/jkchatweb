<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Soft-delete support so user clear/delete and admin wipe keep data
     * recoverable from the admin dashboard.
     */
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->softDeletes();
            $table->foreignId('deleted_by')->nullable()->after('deleted_at')
                ->constrained('users')->nullOnDelete();
            $table->string('delete_reason')->nullable()->after('deleted_by');
        });

        // Track per-member "delete chat" separately from "clear history"
        Schema::table('conversation_members', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('cleared_at');
        });

        // Soft-delete log for admin restore UI (clear / delete / wipe events)
        Schema::create('chat_soft_deletions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('action', ['clear', 'delete', 'admin_wipe'])->default('clear');
            $table->timestamp('effect_at')->nullable(); // cleared_at / hidden_at / deleted_at value
            $table->timestamp('restored_at')->nullable();
            $table->foreignId('restored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'restored_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_soft_deletions');

        Schema::table('conversation_members', function (Blueprint $table) {
            $table->dropColumn('hidden_at');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropColumn(['deleted_at', 'delete_reason']);
        });
    }
};
