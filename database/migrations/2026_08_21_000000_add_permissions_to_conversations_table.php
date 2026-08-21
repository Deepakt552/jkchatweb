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
        Schema::table('conversations', function (Blueprint $table) {
            if (!Schema::hasColumn('conversations', 'edit_permissions')) {
                $table->string('edit_permissions')->default('admins')->after('description');
            }
            if (!Schema::hasColumn('conversations', 'add_permissions')) {
                $table->string('add_permissions')->default('all')->after('edit_permissions');
            }
            if (!Schema::hasColumn('conversations', 'message_permissions')) {
                $table->string('message_permissions')->default('all')->after('add_permissions');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['edit_permissions', 'add_permissions', 'message_permissions']);
        });
    }
};
