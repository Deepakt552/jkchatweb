<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::statement("ALTER TABLE messages MODIFY COLUMN type VARCHAR(32) NOT NULL DEFAULT 'text'");
        } catch (\Throwable $e) {
            try {
                DB::statement("ALTER TABLE messages MODIFY COLUMN type ENUM('text', 'emoji', 'image', 'document', 'code', 'audio', 'contact', 'location', 'system', 'event', 'notification') NOT NULL DEFAULT 'text'");
            } catch (\Throwable $e2) {
                try {
                    Schema::table('messages', function (Blueprint $table) {
                        $table->string('type', 32)->default('text')->change();
                    });
                } catch (\Throwable $e3) {}
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement("ALTER TABLE messages MODIFY COLUMN type ENUM('text', 'emoji', 'image', 'document', 'code', 'audio') NOT NULL DEFAULT 'text'");
        } catch (\Throwable $e) {}
    }
};
