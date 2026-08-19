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
        Schema::table('devices', function (Blueprint $table) {
            if (!Schema::hasColumn('devices', 'device_model')) {
                $table->string('device_model')->nullable()->after('name');
            }
            if (!Schema::hasColumn('devices', 'brand')) {
                $table->string('brand')->nullable()->after('device_model');
            }
            if (!Schema::hasColumn('devices', 'os_version')) {
                $table->string('os_version')->nullable()->after('os');
            }
            if (!Schema::hasColumn('devices', 'hardware_id')) {
                $table->string('hardware_id')->nullable()->after('device_identifier');
            }
            if (!Schema::hasColumn('devices', 'ip_address')) {
                $table->string('ip_address', 45)->nullable()->after('hardware_id');
            }
            if (!Schema::hasColumn('devices', 'user_agent')) {
                $table->text('user_agent')->nullable()->after('ip_address');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn(['device_model', 'brand', 'os_version', 'hardware_id', 'ip_address', 'user_agent']);
        });
    }
};
