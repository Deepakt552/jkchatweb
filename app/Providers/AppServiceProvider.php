<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Repositories\Contracts\UserRepositoryInterface::class,
            \App\Repositories\Eloquent\EloquentUserRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\FriendRepositoryInterface::class,
            \App\Repositories\Eloquent\EloquentFriendRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\ConversationRepositoryInterface::class,
            \App\Repositories\Eloquent\EloquentConversationRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\MessageRepositoryInterface::class,
            \App\Repositories\Eloquent\EloquentMessageRepository::class
        );
        $this->app->bind(
            \App\Repositories\Contracts\SettingRepositoryInterface::class,
            \App\Repositories\Eloquent\EloquentSettingRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
