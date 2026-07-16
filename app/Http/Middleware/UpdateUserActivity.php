<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;

class UpdateUserActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();
        if ($user) {
            $user->update([
                'online_status' => 'online',
                'last_seen_at' => now(),
            ]);

            // Lightweight inline heartbeat garbage collection to clean up stale online users
            User::where('online_status', 'online')
                ->where('last_seen_at', '<', now()->subMinutes(2))
                ->update(['online_status' => 'offline']);
        }

        return $response;
    }
}
