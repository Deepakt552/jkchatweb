<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:setup-reviewer', function () {
    $user = \App\Models\User::updateOrCreate(
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

    $this->info("Reviewer account successfully configured:");
    $this->line(" - Username: dia");
    $this->line(" - Email: dia@diachat.app");
    $this->line(" - Password: 12345678");
    $this->line(" - Fixed OTP: 123456");
})->purpose('Setup or reset Apple App Store & Google Play reviewer account (dia / 12345678 / 123456)');
