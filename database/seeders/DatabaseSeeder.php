<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Seed Admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@securechat.com',
            'username' => 'admin',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'is_admin' => true,
            'is_enabled' => true,
            'online_status' => 'offline',
        ]);

        // Seed Test Employee 1
        User::create([
            'name' => 'Alice Smith',
            'email' => 'alice@securechat.com',
            'username' => 'alice',
            'password' => \Illuminate\Support\Facades\Hash::make('password123'),
            'is_admin' => false,
            'is_enabled' => true,
            'online_status' => 'offline',
        ]);

        // Seed Test Employee 2
        User::updateOrCreate(
            ['username' => 'bob'],
            [
                'name' => 'Bob Jones',
                'email' => 'bob@securechat.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password123'),
                'is_admin' => false,
                'is_enabled' => true,
                'online_status' => 'offline',
            ]
        );

        // Seed Reviewer Account for Apple App Store & Google Play Store
        User::updateOrCreate(
            ['username' => 'dia'],
            [
                'name' => 'Dia',
                'email' => 'dia@diachat.app',
                'password' => \Illuminate\Support\Facades\Hash::make('12345678'),
                'is_admin' => false,
                'is_enabled' => true,
                'is_suspended' => false,
                'otp_code' => '123456',
                'otp_expires_at' => now()->addYears(5),
                'online_status' => 'online',
            ]
        );
    }
}
